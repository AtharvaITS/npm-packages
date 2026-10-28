import { describe, expect, it } from 'vitest';
import {
  TEXT_ALIGN_VALUES,
  describeTextAlignment,
  draftToTextAlignment,
  hasTextAlignment,
  isTextAlignValue,
  textAlignmentCellStyle,
  textAlignmentHeaderContentStyle,
  textAlignmentToDraft,
} from '../../src/conditional/textAlignment';
import type { TextAlignValue } from '../../src/types';

const labels = { left: 'Left', center: 'Center', right: 'Right' };

describe('text alignment guards', () => {
  it('accepts only left, center, and right', () => {
    for (const value of TEXT_ALIGN_VALUES) expect(isTextAlignValue(value)).toBe(true);
    expect(isTextAlignValue('justify')).toBe(false);
    expect(isTextAlignValue('LEFT')).toBe(false);
    expect(isTextAlignValue('')).toBe(false);
  });
});

describe('text alignment draft', () => {
  it('starts a new rule on Left and keeps an applied alignment', () => {
    expect(textAlignmentToDraft(undefined)).toEqual({ alignment: 'left' });
    expect(textAlignmentToDraft({})).toEqual({ alignment: 'left' });
    expect(textAlignmentToDraft({ alignment: 'center' })).toEqual({ alignment: 'center' });
    expect(draftToTextAlignment({ alignment: 'right' })).toEqual({ alignment: 'right' });
  });

  it.each(TEXT_ALIGN_VALUES)('saves %s as the single applied alignment', (alignment: TextAlignValue) => {
    expect(draftToTextAlignment({ alignment })).toEqual({ alignment });
    expect(textAlignmentToDraft({ alignment })).toEqual({ alignment });
  });
});

describe('text alignment css', () => {
  it('leaves the existing column alignment when nothing is applied', () => {
    expect(textAlignmentCellStyle(undefined)).toBeUndefined();
    expect(textAlignmentCellStyle({})).toBeUndefined();
    expect(textAlignmentHeaderContentStyle(undefined)).toBeUndefined();
    expect(textAlignmentHeaderContentStyle({})).toBeUndefined();
    expect(hasTextAlignment(undefined)).toBe(false);
    expect(hasTextAlignment({})).toBe(false);
  });

  it.each([
    ['left', 'flex-start', 'flex-start', 'row'],
    ['center', 'center', 'center', 'row'],
    ['right', 'flex-end', 'flex-start', 'row-reverse'],
  ] as const)(
    'maps %s onto cells and the header label',
    (alignment: TextAlignValue, cellJustify, headerJustify, flexDirection) => {
      expect(textAlignmentCellStyle({ alignment })).toEqual({
        textAlign: alignment,
        justifyContent: cellJustify,
      });
      expect(textAlignmentHeaderContentStyle({ alignment })).toEqual({
        textAlign: alignment,
        justifyContent: headerJustify,
        flexDirection,
      });
      expect(hasTextAlignment({ alignment })).toBe(true);
    },
  );
});

describe('text alignment summary', () => {
  it('omits the summary when no alignment is applied', () => {
    expect(describeTextAlignment({}, 'Text Alignment', labels)).toBeUndefined();
  });

  it.each([
    ['left', 'Left'],
    ['center', 'Center'],
    ['right', 'Right'],
  ] as const)('names %s', (alignment: TextAlignValue, name) => {
    expect(describeTextAlignment({ alignment }, 'Text Alignment', labels)).toBe(
      `Text Alignment: ${name}`,
    );
  });
});
