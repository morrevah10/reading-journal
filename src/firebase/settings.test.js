import { describe, expect, it, vi } from 'vitest';
import { onSnapshot, setDoc } from 'firebase/firestore';
import { saveGenres, subscribeGenres } from './settings';

// The test setup mocks this module for screens; here the real one is tested.
vi.unmock('./settings');
vi.mock('./config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
  onSnapshot: vi.fn(),
  // Never settles, like a write while offline.
  setDoc: vi.fn(() => new Promise(() => {})),
  serverTimestamp: vi.fn(() => 'ts'),
}));

const snapshot = (data) => ({ exists: () => data !== undefined, data: () => data });

describe('genre settings', () => {
  it('reads the saved list, or null when it was never saved', () => {
    const onData = vi.fn();
    subscribeGenres('u1', onData);
    expect(onSnapshot.mock.calls[0][0]).toEqual({ path: 'users/u1/settings/genres' });
    const deliver = onSnapshot.mock.calls[0][1];
    deliver(snapshot({ list: ['מתח'] }));
    deliver(snapshot(undefined));
    deliver(snapshot({}));
    expect(onData.mock.calls).toEqual([[['מתח']], [null], [null]]);
  });

  it('saves the list without waiting for the server', async () => {
    await saveGenres('u1', ['מתח', 'רומן']);
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'users/u1/settings/genres' },
      { list: ['מתח', 'רומן'], updatedAt: 'ts' },
    );
  });
});
