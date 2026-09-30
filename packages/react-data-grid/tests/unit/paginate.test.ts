import { describe, expect, it } from 'vitest';
import {
  clampPage,
  pageCount,
  pageForFirstVisible,
  pageRange,
  pageSlice,
} from '../../src/core/paginate';
import { defaultMessages } from '../../src/i18n/messages';

describe('paginate', () => {
  it('counts pages, with at least one page for 0 rows', () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(500, 25)).toBe(20);
    expect(pageCount(501, 25)).toBe(21);
  });

  it('describes the range "51–75 of N"', () => {
    const { from, to } = pageRange(2, 25, 500);
    expect(defaultMessages.pageRange(from, to, 500)).toBe('51–75 of 500');
    expect(pageRange(0, 25, 0)).toEqual({ from: 0, to: 0 });
    expect(pageRange(1, 25, 30)).toEqual({ from: 26, to: 30 });
  });

  it('slices the current page', () => {
    const items = Array.from({ length: 60 }, (_, i) => i);
    expect(pageSlice(items, 2, 25)).toEqual(items.slice(50, 60));
  });

  it('clamps to the last valid page when data shrinks', () => {
    expect(clampPage(9, 40, 25)).toBe(1);
    expect(clampPage(-3, 40, 25)).toBe(0);
    expect(clampPage(Number.NaN, 40, 25)).toBe(0);
    expect(clampPage(3, 0, 25)).toBe(0);
  });

  it('keeps the first visible record when the page size changes', () => {
    // On page 3 of size 25, the first visible record is index 75.
    expect(pageForFirstVisible(75, 50)).toBe(1);
    expect(pageForFirstVisible(75, 10)).toBe(7);
    expect(pageForFirstVisible(0, 100)).toBe(0);
  });
});
