import { describe, expect, it, vi } from 'vitest';
import { getDoc, getDocs } from 'firebase/firestore';
import { fetchAllData } from './exportData';

vi.mock('./config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((parent, ...segments) =>
    parent?.path ? { path: `${parent.path}/${segments.join('/')}` } : { path: segments.join('/') },
  ),
  doc: vi.fn((parent, ...segments) =>
    parent?.path ? { path: `${parent.path}/${segments.join('/')}` } : { path: segments.join('/') },
  ),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

const docSnap = (id, data) => ({ id, data: vi.fn(() => data) });
const querySnap = (docs) => ({ docs });

describe('fetchAllData', () => {
  it('reads books with their notes and quotes, goals and the genre list', async () => {
    const collections = {
      'users/u1/books': [docSnap('b1', { title: 'Dune' }), docSnap('b2', { title: 'Foundation' })],
      'users/u1/goals': [docSnap('g1', { type: 'books' })],
      'users/u1/books/b1/notes': [docSnap('n1', { text: 'note' })],
      'users/u1/books/b1/quotes': [],
      'users/u1/books/b2/notes': [],
      'users/u1/books/b2/quotes': [docSnap('q1', { text: 'quote', page: 3 })],
    };
    getDocs.mockImplementation(async (ref) => querySnap(collections[ref.path] ?? []));
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ list: ['מתח'] }) });

    const data = await fetchAllData('u1');

    expect(getDoc.mock.calls[0][0]).toEqual({ path: 'users/u1/settings/genres' });
    expect(data).toEqual({
      books: [
        { id: 'b1', title: 'Dune' },
        { id: 'b2', title: 'Foundation' },
      ],
      notes: { b1: [{ id: 'n1', text: 'note' }], b2: [] },
      quotes: { b1: [], b2: [{ id: 'q1', text: 'quote', page: 3 }] },
      goals: [{ id: 'g1', type: 'books' }],
      genres: ['מתח'],
    });
    // Pending server timestamps are read as estimates, like on screen.
    expect(collections['users/u1/books'][0].data).toHaveBeenCalledWith({ serverTimestamps: 'estimate' });
  });

  it('gives null genres when the list was never saved', async () => {
    getDocs.mockResolvedValue(querySnap([]));
    getDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchAllData('u1')).genres).toBeNull();
  });
});
