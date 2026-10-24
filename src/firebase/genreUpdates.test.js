import { describe, expect, it, vi } from 'vitest';
import { writeBatch } from 'firebase/firestore';
import { GENRE_BATCH_LIMIT, saveGenreChange } from './genreUpdates';

vi.mock('./config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
  doc: vi.fn((parent, ...segments) =>
    parent.path ? { path: `${parent.path}/${segments.join('/')}` } : { path: segments.join('/') },
  ),
  serverTimestamp: vi.fn(() => 'ts'),
  writeBatch: vi.fn(),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
}));

function mockBatches() {
  const batches = [];
  writeBatch.mockImplementation(() => {
    // Never settles, like a write while offline.
    const batch = { set: vi.fn(), update: vi.fn(), commit: vi.fn(() => new Promise(() => {})) };
    batches.push(batch);
    return batch;
  });
  return batches;
}

describe('saveGenreChange', () => {
  it('saves the list and renames the genre in books and goals in one batch', async () => {
    const batches = mockBatches();
    await saveGenreChange('u1', {
      list: ['מותחן', 'רומן'],
      bookIds: ['b1', 'b2'],
      goalIds: ['g1'],
      genre: 'מותחן',
    });
    expect(batches).toHaveLength(1);
    const [batch] = batches;
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'users/u1/settings/genres' },
      { list: ['מותחן', 'רומן'], updatedAt: 'ts' },
    );
    expect(batch.update.mock.calls).toEqual([
      [{ path: 'users/u1/books/b1' }, { genre: 'מותחן', updatedAt: 'ts' }],
      [{ path: 'users/u1/books/b2' }, { genre: 'מותחן', updatedAt: 'ts' }],
      [{ path: 'users/u1/goals/g1' }, { genre: 'מותחן', updatedAt: 'ts' }],
    ]);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it('only saves the list when no books or goals change', async () => {
    const batches = mockBatches();
    await saveGenreChange('u1', { list: ['רומן'] });
    expect(batches[0].set).toHaveBeenCalledTimes(1);
    expect(batches[0].update).not.toHaveBeenCalled();
  });

  it('removes the genre from books with null', async () => {
    const batches = mockBatches();
    await saveGenreChange('u1', { list: [], bookIds: ['b1'], genre: null });
    expect(batches[0].update).toHaveBeenCalledWith({ path: 'users/u1/books/b1' }, { genre: null, updatedAt: 'ts' });
  });

  it('splits many writes into batches, the list first', async () => {
    const batches = mockBatches();
    const bookIds = Array.from({ length: GENRE_BATCH_LIMIT + 10 }, (_, i) => `b${i}`);
    await saveGenreChange('u1', { list: ['x'], bookIds, genre: 'x' });
    expect(batches).toHaveLength(2);
    expect(batches[0].set).toHaveBeenCalledTimes(1);
    expect(batches[0].update).toHaveBeenCalledTimes(GENRE_BATCH_LIMIT - 1);
    expect(batches[1].update).toHaveBeenCalledTimes(11);
    batches.forEach((batch) => expect(batch.commit).toHaveBeenCalledTimes(1));
  });
});
