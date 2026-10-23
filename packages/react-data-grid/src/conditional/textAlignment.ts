import type { CSSProperties } from 'react';
import type { TextAlignValue, TextAlignment } from '../types';

export const EMPTY_TEXT_ALIGNMENT: TextAlignment = {};

export const TEXT_ALIGN_VALUES: readonly TextAlignValue[] = ['left', 'center', 'right'];

const TEXT_ALIGN_SET = new Set<string>(TEXT_ALIGN_VALUES);

export interface TextAlignmentDraft {
  alignment: TextAlignValue;
}

export function isTextAlignValue(value: string): value is TextAlignValue {
  return TEXT_ALIGN_SET.has(value);
}

/** A new rule starts on Left. An applied rule opens on its saved value. */
export function textAlignmentToDraft(value: TextAlignment | undefined): TextAlignmentDraft {
  return { alignment: value?.alignment ?? 'left' };
}

export function draftToTextAlignment(draft: TextAlignmentDraft): TextAlignment {
  return { alignment: draft.alignment };
}

/** CSS for one header or data cell. Omitted when the grid should keep column alignment. */
export function textAlignmentCellStyle(value: TextAlignment | undefined): CSSProperties | undefined {
  const alignment = value?.alignment;
  switch (alignment) {
    case undefined:
      return undefined;
    case 'left':
      return { textAlign: 'left', justifyContent: 'flex-start' };
    case 'center':
      return { textAlign: 'center', justifyContent: 'center' };
    case 'right':
      return { textAlign: 'right', justifyContent: 'flex-end' };
    default: {
      const exhaustive: never = alignment;
      void exhaustive;
      return undefined;
    }
  }
}

/**
 * Header label alignment. Right matches the existing end-aligned header:
 * the label sits at the end and the sort indicator stays beside it.
 */
export function textAlignmentHeaderContentStyle(
  value: TextAlignment | undefined,
): CSSProperties | undefined {
  const alignment = value?.alignment;
  switch (alignment) {
    case undefined:
      return undefined;
    case 'left':
      return { textAlign: 'left', justifyContent: 'flex-start', flexDirection: 'row' };
    case 'center':
      return { textAlign: 'center', justifyContent: 'center', flexDirection: 'row' };
    case 'right':
      return { textAlign: 'right', justifyContent: 'flex-start', flexDirection: 'row-reverse' };
    default: {
      const exhaustive: never = alignment;
      void exhaustive;
      return undefined;
    }
  }
}

export function hasTextAlignment(value: TextAlignment | undefined): boolean {
  return textAlignmentCellStyle(value) !== undefined;
}

export function describeTextAlignment(
  value: TextAlignment,
  title: string,
  labels: Record<TextAlignValue, string>,
): string | undefined {
  if (!value.alignment) return undefined;
  return `${title}: ${labels[value.alignment]}`;
}
