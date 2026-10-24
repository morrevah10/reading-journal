import { describe, expect, it, vi } from 'vitest';
import { getDocs, writeBatch } from 'firebase/firestore';
import { deleteBook } from './books';

vi.mock('./config', () => ({ db: { name: 'test-db' } }));

vi.mock('firebase/firestore', () => {
  const ref = (...segments) => ({
    path: segments.filter((s) => typeof s === 'string' && s).join('/'),
  });
  return {
    collection: vi.fn((parent, ...segments) => ref(parent.path ?? '', ...segments)),
    doc: vi.fn((parent, ...segments) => ref(parent.path ?? '', ...segments)),
    getDocs: vi.fn(),
    writeBatch: vi.fn(),
    addDoc: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(),
    updateDoc: vi.fn(),
  };
});

function snapshotOf(prefix, count) {
  return {
    docs: Array.from({ length: count }, (_, i) => ({ ref: { path: `${prefix}/${i}` } })),
  };
}

function mockBatches() {
  const batches = [];
  writeBatch.mockImplementation(() => {
    const batch = { deleted: [], delete: vi.fn((r) => batch.deleted.push(r.path)), commit: vi.fn() };
    batches.push(batch);
    return batch;
  });
  return batches;
}

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
});
