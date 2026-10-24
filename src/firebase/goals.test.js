import { describe, expect, it, vi } from 'vitest';
import { addDoc, setDoc, writeBatch } from 'firebase/firestore';
import { deleteGoal, saveNewGoal } from './goals';

vi.mock('./config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
  doc: vi.fn((parent, id) => ({ path: `${parent.path}/${id}` })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'auto-id' })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  writeBatch: vi.fn(),
}));

describe('saveNewGoal', () => {
  it('uses a deterministic id for recurring goals', async () => {
    const id = await saveNewGoal('u1', {
      seriesId: 'monthly-books',
      recurring: true,
      period: 'monthly',
      startDate: '2026-10-01',
    });
    expect(id).toBe('monthly-books__2026-10');
    expect(setDoc.mock.calls[0][0].path).toBe('users/u1/goals/monthly-books__2026-10');
  });

  it('uses an automatic id for other goals', async () => {
    expect(await saveNewGoal('u1', { recurring: false, period: 'custom' })).toBe('auto-id');
    expect(addDoc).toHaveBeenCalled();
  });
});

describe('deleteGoal', () => {
  it('deletes the goal and turns off renewal on the rest of its series in one batch', async () => {
    const batch = { delete: vi.fn(), update: vi.fn(), commit: vi.fn(() => Promise.resolve()) };
    writeBatch.mockReturnValue(batch);

    await deleteGoal('u1', 'monthly-books__2026-10', ['monthly-books__2026-09']);

    expect(batch.delete).toHaveBeenCalledWith({ path: 'users/u1/goals/monthly-books__2026-10' });
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1/goals/monthly-books__2026-09' },
      expect.objectContaining({ recurring: false }),
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});
