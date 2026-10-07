import { describe, expect, it } from 'vitest';
import {
  describeTextAlignment,
  draftToTextAlignment,
  hasTextAlignment,
  textAlignmentCellStyle,
  textAlignmentHeaderContentStyle,
  textAlignmentToDraft,
} from '../../src/conditional/textAlignment';

describe('text alignment', () => {
  it('starts a new rule on Left and keeps an applied alignment', () => {
    expect(textAlignmentToDraft({})).toEqual({ alignment: 'left' });
    expect(textAlignmentToDraft({ alignment: 'center' })).toEqual({ alignment: 'center' });
    expect(draftToTextAlignment({ alignment: 'right' })).toEqual({ alignment: 'right' });
  });

  it('maps one alignment onto header and cell CSS', () => {
    expect(textAlignmentCellStyle({})).toBeUndefined();
    expect(textAlignmentCellStyle({ alignment: 'left' })).toEqual({
      textAlign: 'left',
      justifyContent: 'flex-start',
    });
    expect(textAlignmentCellStyle({ alignment: 'center' })).toEqual({
      textAlign: 'center',
      justifyContent: 'center',
    });
    expect(textAlignmentCellStyle({ alignment: 'right' })).toEqual({
      textAlign: 'right',
      justifyContent: 'flex-end',
    });
    expect(textAlignmentHeaderContentStyle({ alignment: 'right' })).toEqual({
      textAlign: 'right',
      justifyContent: 'flex-start',
      flexDirection: 'row-reverse',
    });
    expect(textAlignmentHeaderContentStyle({ alignment: 'center' })?.flexDirection).toBe('row');
  });

  it('describes the single applied alignment', () => {
    const labels = { left: 'Left', center: 'Center', right: 'Right' };
    expect(hasTextAlignment({})).toBe(false);
    expect(hasTextAlignment({ alignment: 'center' })).toBe(true);
    expect(describeTextAlignment({ alignment: 'center' }, 'Text Alignment', labels)).toBe(
      'Text Alignment: Center',
    );
    expect(describeTextAlignment({}, 'Text Alignment', labels)).toBeUndefined();
  });
});
