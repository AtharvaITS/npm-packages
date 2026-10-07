import type { CSSProperties } from 'react';
import type { HeaderFontWeight, HeaderStyle, HeaderTextTransform } from '../types';

export const EMPTY_HEADER_STYLE: HeaderStyle = {};

export const HEADER_FONT_WEIGHTS: readonly HeaderFontWeight[] = [
  'default',
  'normal',
  '500',
  '600',
  '700',
];

export const HEADER_TEXT_TRANSFORMS: readonly HeaderTextTransform[] = [
  'default',
  'uppercase',
  'lowercase',
  'capitalize',
];

export interface HeaderStyleDraft {
  backgroundColor: string;
  textColor: string;
  fontSize: string;
  fontWeight: HeaderFontWeight;
  textTransform: HeaderTextTransform;
}

export type HeaderStyleError = 'fontSize';

const FONT_WEIGHT_SET = new Set<string>(HEADER_FONT_WEIGHTS);
const TEXT_TRANSFORM_SET = new Set<string>(HEADER_TEXT_TRANSFORMS);

export function isHeaderFontWeight(value: string): value is HeaderFontWeight {
  return FONT_WEIGHT_SET.has(value);
}

export function isHeaderTextTransform(value: string): value is HeaderTextTransform {
  return TEXT_TRANSFORM_SET.has(value);
}

export function headerStyleToDraft(style: HeaderStyle | undefined): HeaderStyleDraft {
  return {
    backgroundColor: style?.backgroundColor ?? '',
    textColor: style?.textColor ?? '',
    fontSize: style?.fontSize !== undefined ? String(style.fontSize) : '',
    fontWeight: style?.fontWeight ?? 'default',
    textTransform: style?.textTransform ?? 'default',
  };
}

/** Empty string keeps the current header size. `null` is not a usable size. */
function parseFontSize(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function draftToHeaderStyle(
  draft: HeaderStyleDraft,
): { ok: true; style: HeaderStyle } | { ok: false; error: HeaderStyleError } {
  const fontSize = parseFontSize(draft.fontSize);
  if (fontSize === null) return { ok: false, error: 'fontSize' };
  const style: HeaderStyle = {};
  if (draft.backgroundColor) style.backgroundColor = draft.backgroundColor;
  if (draft.textColor) style.textColor = draft.textColor;
  if (fontSize !== undefined) style.fontSize = fontSize;
  if (draft.fontWeight !== 'default') style.fontWeight = draft.fontWeight;
  if (draft.textTransform !== 'default') style.textTransform = draft.textTransform;
  return { ok: true, style: Object.keys(style).length === 0 ? EMPTY_HEADER_STYLE : style };
}

function fontWeightCss(weight: HeaderFontWeight | undefined): CSSProperties['fontWeight'] | undefined {
  switch (weight) {
    case undefined:
    case 'default':
      return undefined;
    case 'normal':
      return 'normal';
    case '500':
      return '500';
    case '600':
      return '600';
    case '700':
      return '700';
    default: {
      const exhaustive: never = weight;
      void exhaustive;
      return undefined;
    }
  }
}

function textTransformCss(
  value: HeaderTextTransform | undefined,
): CSSProperties['textTransform'] | undefined {
  switch (value) {
    case undefined:
    case 'default':
      return undefined;
    case 'uppercase':
      return 'uppercase';
    case 'lowercase':
      return 'lowercase';
    case 'capitalize':
      return 'capitalize';
    default: {
      const exhaustive: never = value;
      void exhaustive;
      return undefined;
    }
  }
}

/** CSS for the header row. Default values are omitted so the existing header look stays. */
export function headerStyleToCss(style: HeaderStyle | undefined): CSSProperties | undefined {
  if (!style) return undefined;
  const css: CSSProperties = {};
  const vars = css as CSSProperties & Record<string, string>;
  if (style.backgroundColor) {
    css.backgroundColor = style.backgroundColor;
    vars['--aits-header-bg'] = style.backgroundColor;
  }
  if (style.textColor) css.color = style.textColor;
  if (style.fontSize !== undefined && Number.isFinite(style.fontSize) && style.fontSize > 0) {
    css.fontSize = `${style.fontSize}px`;
  }
  const fontWeight = fontWeightCss(style.fontWeight);
  if (fontWeight !== undefined) css.fontWeight = fontWeight;
  const textTransform = textTransformCss(style.textTransform);
  if (textTransform !== undefined) css.textTransform = textTransform;
  return Object.keys(css).length > 0 ? css : undefined;
}

export function hasHeaderStyle(style: HeaderStyle | undefined): boolean {
  return headerStyleToCss(style) !== undefined;
}
