import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { addBook, deleteBook, updateBook } from './books';

vi.mock('./config', () => ({ db: { name: 'test-db' } }));

// A promise that never settles, like a Firestore write while offline.
const never = () => new Promise(() => {});

vi.mock('firebase/firestore', () => {
  const ref = (...segments) => {
    const path = segments.filter((s) => typeof s === 'string' && s).join('/');
    return { path, id: path.split('/').at(-1) };
  };
  return {
    collection: vi.fn((parent, ...segments) => ref(parent.path ?? '', ...segments)),
    // doc(collection) without an id generates one locally.
    doc: vi.fn((parent, ...segments) =>
      ref(parent.path ?? '', ...(segments.length ? segments : ['local-id'])),
    ),
    getDocs: vi.fn(),
    writeBatch: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'ts'),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function snapshotOf(prefix, count) {
  return {
    docs: Array.from({ length: count }, (_, i) => ({ ref: { path: `${prefix}/${i}` } })),
  };
}

function mockBatches(commit = () => Promise.resolve()) {
  const batches = [];
  writeBatch.mockImplementation(() => {
    const batch = {
      deleted: [],
      delete: vi.fn((r) => batch.deleted.push(r.path)),
      commit: vi.fn(commit),
    };
    batches.push(batch);
    return batch;
  });
  return batches;
}

describe('offline-safe writes', () => {
  it('addBook returns a locally generated id without waiting for the server', async () => {
    setDoc.mockImplementation(never);
    const id = await addBook('u1', { title: 'Dune' });
    expect(id).toBe('local-id');
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'users/u1/books/local-id', id: 'local-id' },
      { title: 'Dune', createdAt: 'ts', updatedAt: 'ts' },
    );
  });

  it('updateBook resolves without waiting for the server', async () => {
    updateDoc.mockImplementation(never);
    await expect(updateBook('u1', 'b1', { summary: 'x' })).resolves.toBeUndefined();
  });

  it('a later rejection from the server is logged, not thrown', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rejected = Promise.reject(new Error('permission-denied'));
    updateDoc.mockReturnValue(rejected);
    await updateBook('u1', 'b1', { summary: 'x' });
    await rejected.catch(() => {});
    expect(log).toHaveBeenCalled();
  });

  it('invalid data still fails the call', async () => {
    updateDoc.mockImplementation(() => {
      throw new Error('invalid data');
    });
    await expect(updateBook('u1', 'b1', { summary: undefined })).rejects.toThrow('invalid data');
  });
});

describe('deleteBook', () => {
  it('deletes all notes, quotes and finally the book', async () => {
    getDocs.mockImplementation(async (col) =>
      snapshotOf(col.path, col.path.endsWith('notes') ? 2 : 1),
    );
    const batches = mockBatches();

    await deleteBook('u1', 'b1');

    expect(batches).toHaveLength(1);
    const deleted = batches[0].deleted;
    expect(deleted).toHaveLength(4);
    expect(deleted.filter((p) => p.includes('/notes/'))).toHaveLength(2);
    expect(deleted.filter((p) => p.includes('/quotes/'))).toHaveLength(1);
    expect(deleted.at(-1)).toBe('users/u1/books/b1');
    expect(batches[0].commit).toHaveBeenCalled();
  });

  it('splits more than 500 deletions into several batches', async () => {
    getDocs.mockImplementation(async (col) =>
      snapshotOf(col.path, col.path.endsWith('notes') ? 600 : 0),
    );
    const batches = mockBatches();

    await deleteBook('u1', 'b1');

    expect(batches.map((b) => b.deleted.length)).toEqual([500, 101]);
    expect(batches[1].deleted.at(-1)).toBe('users/u1/books/b1');
  });

  it('does not wait for the server to confirm the deletion', async () => {
    getDocs.mockImplementation(async (col) => snapshotOf(col.path, 1));
    const batches = mockBatches(never);
    await deleteBook('u1', 'b1');
    expect(batches[0].commit).toHaveBeenCalled();
  });
});
