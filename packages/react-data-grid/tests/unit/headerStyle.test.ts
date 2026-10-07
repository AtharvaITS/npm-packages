import { describe, expect, it } from 'vitest';
import {
  draftToHeaderStyle,
  headerStyleToCss,
  headerStyleToDraft,
} from '../../src/conditional/headerStyle';

describe('header style', () => {
  it('keeps the existing header when every control is left at default', () => {
    const result = draftToHeaderStyle({
      backgroundColor: '',
      textColor: '',
      fontSize: '',
      fontWeight: 'default',
      textTransform: 'default',
    });
    expect(result).toEqual({ ok: true, style: {} });
    expect(headerStyleToCss({})).toBeUndefined();
  });

  it('maps a saved style onto header CSS without rewriting text', () => {
    const result = draftToHeaderStyle({
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
      fontSize: '14',
      fontWeight: '700',
      textTransform: 'uppercase',
    });
    expect(result).toEqual({
      ok: true,
      style: {
        backgroundColor: '#1e293b',
        textColor: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
      },
    });
    expect(headerStyleToCss(result.ok ? result.style : undefined)).toEqual({
      backgroundColor: '#1e293b',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '700',
      textTransform: 'uppercase',
      '--aits-header-bg': '#1e293b',
    });
  });

  it('rejects a font size that is not a positive number', () => {
    expect(
      draftToHeaderStyle({
        backgroundColor: '',
        textColor: '',
        fontSize: '0',
        fontWeight: 'default',
        textTransform: 'default',
      }).ok,
    ).toBe(false);
    expect(
      draftToHeaderStyle({
        backgroundColor: '',
        textColor: '',
        fontSize: 'nope',
        fontWeight: 'default',
        textTransform: 'default',
      }).ok,
    ).toBe(false);
  });

  it('restores a saved style into the editor draft', () => {
    expect(
      headerStyleToDraft({
        backgroundColor: '#1e293b',
        fontSize: 14,
        fontWeight: '500',
        textTransform: 'capitalize',
      }),
    ).toEqual({
      backgroundColor: '#1e293b',
      textColor: '',
      fontSize: '14',
      fontWeight: '500',
      textTransform: 'capitalize',
    });
  });
});
