import { describe, expect, it, vi } from 'vitest';
import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { addEntry, deleteEntry, updateEntry } from './entries';

vi.mock('./config', () => ({ db: {} }));

// Every write never settles, like a Firestore write while offline.
vi.mock('firebase/firestore', () => {
  const never = () => new Promise(() => {});
  return {
    collection: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
    doc: vi.fn((parent, id = 'local-id') => ({ path: `${parent.path}/${id}`, id })),
    setDoc: vi.fn(never),
    updateDoc: vi.fn(never),
    deleteDoc: vi.fn(never),
    onSnapshot: vi.fn(),
    orderBy: vi.fn(),
    query: vi.fn(),
    serverTimestamp: vi.fn(() => 'ts'),
  };
});

describe('entries work offline', () => {
  it('addEntry returns a locally generated id at once', async () => {
    expect(await addEntry('u1', 'b1', 'notes', { text: 'hi' })).toBe('local-id');
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'users/u1/books/b1/notes/local-id', id: 'local-id' },
      { text: 'hi', createdAt: 'ts' },
    );
  });

  it('updateEntry and deleteEntry resolve at once', async () => {
    await updateEntry('u1', 'b1', 'quotes', 'q1', { text: 'x' });
    await deleteEntry('u1', 'b1', 'quotes', 'q1');
    expect(updateDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
  });
});
