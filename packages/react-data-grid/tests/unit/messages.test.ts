import { describe, expect, it } from 'vitest';
import { defaultMessages, mergeMessages } from '../../src/i18n/messages';
import type { Messages } from '../../src/types';

describe('mergeMessages', () => {
  it('returns the built-in messages when nothing is overridden', () => {
    expect(mergeMessages()).toBe(defaultMessages);
    expect(mergeMessages(undefined)).toBe(defaultMessages);
  });

  it('overrides strings and functions, and merges operator labels', () => {
    const merged = mergeMessages({
      empty: 'Vide',
      pageRange: (from, _to, total) => `${from}/${total}`,
      operators: { contains: 'contient' } as Messages['operators'],
    });
    expect(merged.empty).toBe('Vide');
    expect(merged.searchPlaceholder).toBe(defaultMessages.searchPlaceholder);
    expect(merged.pageRange(1, 2, 9)).toBe('1/9');
    expect(merged.operators.contains).toBe('contient');
    expect(merged.operators.equals).toBe(defaultMessages.operators.equals);
    expect(merged.resultsCount(1)).toBe('1 result');
  });

  it('merges header formatting labels and keeps the rest of the built-in maps', () => {
    const merged = mergeMessages({
      headerStyle: 'En-tête',
      headerStyleFontWeights: { '700': 'Gras' } as Messages['headerStyleFontWeights'],
      headerStyleTransforms: { uppercase: 'Majuscules' } as Messages['headerStyleTransforms'],
    });
    expect(merged.headerStyle).toBe('En-tête');
    expect(merged.headerStyleFontWeights['700']).toBe('Gras');
    expect(merged.headerStyleFontWeights.normal).toBe(defaultMessages.headerStyleFontWeights.normal);
    expect(merged.headerStyleTransforms.uppercase).toBe('Majuscules');
    expect(merged.headerStyleTransforms.lowercase).toBe(defaultMessages.headerStyleTransforms.lowercase);
    expect(merged.headerStyleApply).toBe(defaultMessages.headerStyleApply);
  });
});
