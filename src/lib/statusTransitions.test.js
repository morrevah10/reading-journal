import { describe, expect, it } from 'vitest';
import { TransitionError, applyTransition, availableActions } from './statusTransitions';

const TODAY = '2026-10-24';

const reading = { status: 'reading', startDate: '2026-10-01', endDate: null, rating: null };
const finished = {
  status: 'finished',
  startDate: '2026-09-01',
  endDate: '2026-09-20',
  rating: 4,
  review: 'great',
};
const abandoned = {
  status: 'abandoned',
  startDate: '2026-09-01',
  endDate: '2026-09-10',
  abandonReason: 'boring',
};

describe('availableActions', () => {
  it.each([
    ['want', ['start']],
    ['reading', ['finish', 'abandon']],
    ['finished', ['reread']],
    ['abandoned', ['resume']],
  ])('%s → %j', (status, actions) => {
    expect(availableActions(status)).toEqual(actions);
  });
});

describe('applyTransition', () => {
  it('start: want → reading with startDate = today', () => {
    expect(applyTransition({ status: 'want' }, 'start', { today: TODAY })).toEqual({
      status: 'reading',
      startDate: TODAY,
    });
  });

  it('start accepts a custom date', () => {
    expect(applyTransition({ status: 'want' }, 'start', { today: TODAY, date: '2026-10-20' }))
      .toMatchObject({ startDate: '2026-10-20' });
  });

  it('finish: reading → finished with endDate = today, rating and review', () => {
    expect(
      applyTransition(reading, 'finish', { today: TODAY, rating: 5, review: '  loved it  ' }),
    ).toEqual({ status: 'finished', endDate: TODAY, rating: 5, review: 'loved it' });
  });

  it('finish without rating or review (skip) leaves review untouched', () => {
    const patch = applyTransition(reading, 'finish', { today: TODAY });
    expect(patch).toEqual({ status: 'finished', endDate: TODAY, rating: null });
    expect(patch).not.toHaveProperty('review');
  });

  it('finish rejects an end date before the start date', () => {
    expect(() => applyTransition(reading, 'finish', { date: '2026-09-30' })).toThrow(
      TransitionError,
    );
  });

  it('finish allows the same day as start', () => {
    expect(applyTransition(reading, 'finish', { date: '2026-10-01' }).endDate).toBe('2026-10-01');
  });

  it.each([0, 6, 3.5, '4'])('finish rejects rating %j', (rating) => {
    expect(() => applyTransition(reading, 'finish', { today: TODAY, rating })).toThrow(
      TransitionError,
    );
  });

  it('abandon: reading → abandoned with endDate and optional reason', () => {
    expect(applyTransition(reading, 'abandon', { today: TODAY, reason: ' too slow ' })).toEqual({
      status: 'abandoned',
      endDate: TODAY,
      abandonReason: 'too slow',
    });
    expect(applyTransition(reading, 'abandon', { today: TODAY }).abandonReason).toBeNull();
  });

  it('resume: abandoned → reading, endDate cleared, startDate kept', () => {
    const patch = applyTransition(abandoned, 'resume', { today: TODAY });
    expect(patch).toEqual({ status: 'reading', endDate: null, abandonReason: null });
    expect(patch).not.toHaveProperty('startDate');
  });

  it('reread: finished → reading, endDate and rating cleared, startDate = today, review kept', () => {
    const patch = applyTransition(finished, 'reread', { today: TODAY });
    expect(patch).toEqual({ status: 'reading', startDate: TODAY, endDate: null, rating: null });
    expect(patch).not.toHaveProperty('review');
  });

  it.each([
    ['want', 'finish'],
    ['want', 'abandon'],
    ['abandoned', 'finish'],
    ['finished', 'abandon'],
    ['reading', 'start'],
    ['reading', 'resume'],
  ])('rejects %s → %s', (status, action) => {
    expect(() => applyTransition({ status }, action, { today: TODAY })).toThrow(TransitionError);
  });

  it.each([
    [{ status: 'want' }, 'start'],
    [reading, 'finish'],
    [reading, 'abandon'],
    [finished, 'reread'],
  ])('rejects a future date for %j %s', (book, action) => {
    expect(() => applyTransition(book, action, { today: TODAY, date: '2026-10-25' })).toThrow(
      'התאריך לא יכול להיות בעתיד',
    );
  });

  it('accepts today as an explicit date', () => {
    expect(applyTransition(reading, 'finish', { today: TODAY, date: TODAY }).endDate).toBe(TODAY);
  });

  it('rejects unknown actions', () => {
    expect(() => applyTransition(reading, 'explode')).toThrow(TransitionError);
  });
});
