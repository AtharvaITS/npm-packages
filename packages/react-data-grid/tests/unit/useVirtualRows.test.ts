import { describe, expect, it } from 'vitest';
import { computeRange } from '../../src/virtual/useVirtualRows';

describe('computeRange (fixed-size virtualization)', () => {
  it('returns the visible window plus overscan', () => {
    const r = computeRange({
      count: 100_000,
      itemSize: 40,
      scrollTop: 4000,
      viewportHeight: 600,
      overscan: 5,
    });
    // first visible = 100; visible count = ceil(600/40)+1 = 16
    expect(r.start).toBe(95);
    expect(r.end).toBe(121);
    expect(r.offsetTop).toBe(95 * 40);
    expect(r.totalSize).toBe(4_000_000);
  });

  it('clamps at the start and the end', () => {
    expect(computeRange({ count: 10, itemSize: 40, scrollTop: 0, viewportHeight: 600 }).start).toBe(
      0,
    );
    const end = computeRange({ count: 100, itemSize: 40, scrollTop: 999_999, viewportHeight: 600 });
    expect(end.end).toBe(100);
    expect(end.start).toBeLessThan(100);
  });

  it('handles zero rows', () => {
    expect(computeRange({ count: 0, itemSize: 40, scrollTop: 0, viewportHeight: 600 })).toEqual({
      start: 0,
      end: 0,
      offsetTop: 0,
      totalSize: 0,
    });
  });

  it('accounts for a sticky header offset', () => {
    const r = computeRange({
      count: 1000,
      itemSize: 40,
      scrollTop: 440,
      viewportHeight: 400,
      overscan: 0,
      headerOffset: 40,
    });
    expect(r.start).toBe(10);
  });
});
