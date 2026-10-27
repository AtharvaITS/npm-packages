import { describe, expect, it } from 'vitest';
import {
  HEADER_FONT_WEIGHTS,
  HEADER_TEXT_TRANSFORMS,
  describeHeaderStyle,
  draftToHeaderStyle,
  hasHeaderStyle,
  headerLabelStyle,
  headerStyleToCss,
  headerStyleToDraft,
  isHeaderFontWeight,
  isHeaderTextTransform,
  type HeaderStyleDraft,
} from '../../src/conditional/headerStyle';
import type { HeaderFontWeight, HeaderTextTransform } from '../../src/types';

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
      fontWeight: 'bold',
      textTransform: 'uppercase',
    });
    expect(result).toEqual({
      ok: true,
      style: {
        backgroundColor: '#1e293b',
        textColor: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
      },
    });
    expect(headerStyleToCss(result.ok ? result.style : undefined)).toEqual({
      backgroundColor: '#1e293b',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 700,
      fontStyle: 'normal',
      textTransform: 'uppercase',
      '--aits-header-bg': '#1e293b',
      '--aits-header-transform': 'uppercase',
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

  it('describes the applied header style and maps each text transform', () => {
    expect(headerLabelStyle({ textTransform: 'lowercase' })).toEqual({ textTransform: 'lowercase' });
    expect(headerLabelStyle({ textTransform: 'capitalize' })).toEqual({ textTransform: 'capitalize' });
    expect(headerLabelStyle({ textTransform: 'default' })).toBeUndefined();
    expect(
      describeHeaderStyle(
        { backgroundColor: '#1e293b', textColor: '#ffffff', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
        {
          background: 'Background Color',
          text: 'Text Color',
          fontSize: 'Font Size',
          fontSizeUnit: 'px',
          fontWeight: 'Font Weight',
          textTransform: 'Text Transform',
          weights: { default: 'Default', italic: 'Italic', bold: 'Bold' },
          transforms: { default: 'Default', uppercase: 'Uppercase', lowercase: 'Lowercase', capitalize: 'Capitalize' },
        },
      ),
    ).toEqual([
      'Background Color: #1e293b',
      'Text Color: #ffffff',
      'Font Size: 14px',
      'Font Weight: Bold',
      'Text Transform: Uppercase',
    ]);
  });

  it('restores a saved style into the editor draft', () => {
    expect(
      headerStyleToDraft({
        backgroundColor: '#1e293b',
        fontSize: 14,
        fontWeight: 'italic',
        textTransform: 'capitalize',
      }),
    ).toEqual({
      backgroundColor: '#1e293b',
      textColor: '',
      fontSize: '14',
      fontWeight: 'italic',
      textTransform: 'capitalize',
    });
    expect(headerStyleToDraft(undefined)).toEqual({
      backgroundColor: '',
      textColor: '',
      fontSize: '',
      fontWeight: 'default',
      textTransform: 'default',
    });
  });
});

const blankDraft = (overrides: Partial<HeaderStyleDraft> = {}): HeaderStyleDraft => ({
  backgroundColor: '',
  textColor: '',
  fontSize: '',
  fontWeight: 'default',
  textTransform: 'default',
  ...overrides,
});

const labels = {
  background: 'Background Color',
  text: 'Text Color',
  fontSize: 'Font Size',
  fontSizeUnit: 'px',
  fontWeight: 'Font Weight',
  textTransform: 'Text Transform',
  weights: { default: 'Default', italic: 'Italic', bold: 'Bold' },
  transforms: { default: 'Default', uppercase: 'Uppercase', lowercase: 'Lowercase', capitalize: 'Capitalize' },
};

describe('header formatting guards', () => {
  it('accepts only the known font weights and text transforms', () => {
    for (const weight of HEADER_FONT_WEIGHTS) expect(isHeaderFontWeight(weight)).toBe(true);
    expect(isHeaderFontWeight('700')).toBe(false);
    expect(isHeaderFontWeight('normal')).toBe(false);
    expect(isHeaderFontWeight('')).toBe(false);

    for (const transform of HEADER_TEXT_TRANSFORMS) expect(isHeaderTextTransform(transform)).toBe(true);
    expect(isHeaderTextTransform('none')).toBe(false);
    expect(isHeaderTextTransform('')).toBe(false);
  });
});

describe('header formatting draft', () => {
  it('keeps a single chosen property and trims a usable font size', () => {
    expect(draftToHeaderStyle(blankDraft({ backgroundColor: '#112233' }))).toEqual({
      ok: true,
      style: { backgroundColor: '#112233' },
    });
    expect(draftToHeaderStyle(blankDraft({ textColor: '#abcdef' }))).toEqual({
      ok: true,
      style: { textColor: '#abcdef' },
    });
    expect(draftToHeaderStyle(blankDraft({ fontSize: '  13.5  ' }))).toEqual({
      ok: true,
      style: { fontSize: 13.5 },
    });
    expect(draftToHeaderStyle(blankDraft({ fontWeight: 'italic' }))).toEqual({
      ok: true,
      style: { fontWeight: 'italic' },
    });
    expect(draftToHeaderStyle(blankDraft({ textTransform: 'lowercase' }))).toEqual({
      ok: true,
      style: { textTransform: 'lowercase' },
    });
  });

  it('treats a blank font size as leaving the current header size', () => {
    expect(draftToHeaderStyle(blankDraft({ fontSize: '   ' }))).toEqual({ ok: true, style: {} });
  });

  it.each(['-1', '0', 'nope', 'Infinity'])('rejects font size %s', (fontSize) => {
    expect(draftToHeaderStyle(blankDraft({ fontSize }))).toEqual({ ok: false, error: 'fontSize' });
  });
});

describe('header formatting css', () => {
  it('omits an empty style and a non-positive font size', () => {
    expect(headerStyleToCss(undefined)).toBeUndefined();
    expect(headerStyleToCss({ fontWeight: 'default', textTransform: 'default' })).toBeUndefined();
    expect(headerStyleToCss({ fontSize: 0 })).toBeUndefined();
    expect(headerStyleToCss({ fontSize: Number.NaN })).toBeUndefined();
    expect(headerStyleToCss({ fontSize: -4 })).toBeUndefined();
    expect(hasHeaderStyle(undefined)).toBe(false);
    expect(hasHeaderStyle({})).toBe(false);
    expect(hasHeaderStyle({ textColor: '#111111' })).toBe(true);
  });

  it.each([
    ['italic', { fontWeight: 400, fontStyle: 'italic' }],
    ['bold', { fontWeight: 700, fontStyle: 'normal' }],
  ] as const)('maps font weight %s onto the header row and the label', (fontWeight, face) => {
    expect(headerStyleToCss({ fontWeight })).toEqual(face);
    expect(headerLabelStyle({ fontWeight })).toEqual(face);
  });

  it('reads an older numeric bold weight as bold', () => {
    expect(headerStyleToCss({ fontWeight: '700' as HeaderFontWeight })).toEqual({
      fontWeight: 700,
      fontStyle: 'normal',
    });
    expect(headerStyleToDraft({ fontWeight: '600' as HeaderFontWeight }).fontWeight).toBe('bold');
  });

  it.each(['uppercase', 'lowercase', 'capitalize'] as const)(
    'maps %s onto the header row and the label',
    (textTransform: HeaderTextTransform) => {
      expect(headerStyleToCss({ textTransform })).toEqual({
        textTransform,
        '--aits-header-transform': textTransform,
      });
      expect(headerLabelStyle({ textTransform })).toEqual({ textTransform });
    },
  );

  it('sets the background variable without changing the label text style', () => {
    expect(headerStyleToCss({ backgroundColor: '#1e293b', textColor: '#ffffff' })).toEqual({
      backgroundColor: '#1e293b',
      color: '#ffffff',
      '--aits-header-bg': '#1e293b',
    });
    expect(headerLabelStyle({ backgroundColor: '#1e293b' })).toBeUndefined();
    expect(headerLabelStyle(undefined)).toBeUndefined();
  });
});

describe('header formatting summary', () => {
  it('lists only the properties that change the header', () => {
    expect(describeHeaderStyle({}, labels)).toEqual([]);
    expect(describeHeaderStyle({ fontWeight: 'default', textTransform: 'default', fontSize: 0 }, labels)).toEqual(
      [],
    );
    expect(describeHeaderStyle({ backgroundColor: '#112233' }, labels)).toEqual(['Background Color: #112233']);
    expect(describeHeaderStyle({ textColor: '#abcdef' }, labels)).toEqual(['Text Color: #abcdef']);
    expect(describeHeaderStyle({ fontSize: 16 }, labels)).toEqual(['Font Size: 16px']);
  });

  it.each([
    ['italic', 'Italic'],
    ['bold', 'Bold'],
  ] as const)('names font weight %s', (fontWeight: HeaderFontWeight, name) => {
    expect(describeHeaderStyle({ fontWeight }, labels)).toEqual([`Font Weight: ${name}`]);
  });

  it.each([
    ['uppercase', 'Uppercase'],
    ['lowercase', 'Lowercase'],
    ['capitalize', 'Capitalize'],
  ] as const)('names text transform %s', (textTransform: HeaderTextTransform, name) => {
    expect(describeHeaderStyle({ textTransform }, labels)).toEqual([`Text Transform: ${name}`]);
  });
});
