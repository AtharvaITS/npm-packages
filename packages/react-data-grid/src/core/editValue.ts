import type { EffectiveColumn } from './columnState';
import type { ResolvedType } from './columns';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Field-backed columns and columns with `valueSetter` can be edited. Custom-rendered cells stay as they are. */
export function canEditColumn(column: {
  field?: string;
  valueGetter?: unknown;
  valueSetter?: unknown;
  render?: unknown;
}): boolean {
  if (column.render != null) return false;
  if (column.valueSetter != null) return true;
  return typeof column.field === 'string' && column.field.length > 0 && column.valueGetter == null;
}

export type EditorKind = 'text' | 'number' | 'date' | 'boolean' | 'enum';

export interface EditorModel {
  kind: EditorKind;
  text: string;
  checked: boolean;
  options: readonly unknown[];
}

function formatYmd(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value.trim());
}

/** Raw value shown in the editor. Percent stays the stored fraction (0.25, not 25%). Objects use `formatted`. */
export function editorModel(column: EffectiveColumn, value: unknown, formatted = ''): EditorModel {
  if (column.type === 'boolean') {
    return { kind: 'boolean', text: '', checked: value === true, options: [] };
  }
  if (column.type === 'enum' && column.enumValues && column.enumValues.length > 0) {
    return {
      kind: 'enum',
      text: value == null ? '' : String(value),
      checked: false,
      options: column.enumValues,
    };
  }
  if (column.type === 'number' || column.type === 'currency' || column.type === 'percent') {
    const text =
      typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : value == null || value === ''
          ? ''
          : String(value);
    return { kind: 'number', text, checked: false, options: [] };
  }
  if (column.type === 'date' && (value instanceof Date || isDateOnly(value))) {
    return {
      kind: 'date',
      text: value instanceof Date ? formatYmd(value) : value.trim(),
      checked: false,
      options: [],
    };
  }
  const text =
    value !== null && typeof value === 'object' && !(value instanceof Date)
      ? formatted
      : value == null
        ? ''
        : typeof value === 'string'
          ? value
          : String(value);
  return { kind: 'text', text, checked: false, options: [] };
}

export type ParsedEdit = { ok: true; value: unknown } | { ok: false };

function parseNumber(text: string): ParsedEdit {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value };
}

function parseCalendarDate(text: string, asDate: boolean): ParsedEdit {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  const match = DATE_ONLY.exec(trimmed);
  if (!match) return { ok: false };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { ok: false };
  }
  return { ok: true, value: asDate ? date : trimmed };
}

/** Turns the editor draft into the value passed to `onCellEdit`. */
export function parseEditedValue(
  column: EffectiveColumn,
  previous: unknown,
  draft: string | boolean,
): ParsedEdit {
  const type: ResolvedType = column.type;
  switch (type) {
    case 'boolean':
      return { ok: true, value: draft === true };
    case 'number':
    case 'currency':
    case 'percent':
      return parseNumber(typeof draft === 'string' ? draft : '');
    case 'date':
      if (previous instanceof Date || isDateOnly(previous)) {
        return parseCalendarDate(typeof draft === 'string' ? draft : '', previous instanceof Date);
      }
      return { ok: true, value: typeof draft === 'string' ? draft : String(draft) };
    case 'enum': {
      const text = typeof draft === 'string' ? draft : String(draft);
      const match = column.enumValues?.find((option) => String(option) === text);
      return { ok: true, value: match !== undefined ? match : text };
    }
    case 'text':
    case 'image':
      return { ok: true, value: typeof draft === 'string' ? draft : String(draft) };
    default: {
      const unreachable: never = type;
      return unreachable;
    }
  }
}
