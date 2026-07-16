import { describe, it, expect } from 'vitest';
import { msToClock, totalDuration } from '../public/format.js';

describe('msToClock', () => {
  it('formats zero as 0:00', () => {
    expect(msToClock(0)).toBe('0:00');
  });

  it('zero-pads seconds under a minute', () => {
    expect(msToClock(7000)).toBe('0:07');
    expect(msToClock(59000)).toBe('0:59');
  });

  it('rolls seconds into minutes', () => {
    expect(msToClock(60000)).toBe('1:00');
    expect(msToClock(187000)).toBe('3:07');
  });

  it('switches to h:mm:ss at an hour or more', () => {
    expect(msToClock(3600000)).toBe('1:00:00');
    expect(msToClock(3661000)).toBe('1:01:01');
  });

  it('rounds to the nearest second', () => {
    expect(msToClock(1499)).toBe('0:01');
    expect(msToClock(1500)).toBe('0:02');
  });

  it('treats missing/invalid input as zero', () => {
    expect(msToClock(null)).toBe('0:00');
    expect(msToClock(undefined)).toBe('0:00');
    expect(msToClock('nope')).toBe('0:00');
  });
});

describe('totalDuration', () => {
  it('is zero for an empty or missing list', () => {
    expect(totalDuration([])).toEqual({ ms: 0, clock: '0:00' });
    expect(totalDuration(undefined)).toEqual({ ms: 0, clock: '0:00' });
  });

  it('sums Milliseconds across tracks', () => {
    const tracks = [{ Milliseconds: 180000 }, { Milliseconds: 240000 }];
    expect(totalDuration(tracks)).toEqual({ ms: 420000, clock: '7:00' });
  });

  it('formats totals over an hour as h:mm:ss', () => {
    const tracks = [{ Milliseconds: 3600000 }, { Milliseconds: 120000 }];
    expect(totalDuration(tracks)).toEqual({ ms: 3720000, clock: '1:02:00' });
  });

  it('ignores tracks with missing durations', () => {
    const tracks = [{ Milliseconds: 60000 }, {}, { Milliseconds: null }];
    expect(totalDuration(tracks)).toEqual({ ms: 60000, clock: '1:00' });
  });
});
