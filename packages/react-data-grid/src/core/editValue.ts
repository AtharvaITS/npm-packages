import type { EffectiveColumn } from './columnState';
import { getColumnValue, type ResolvedType } from './columns';
import { isRecord, type AnyRow } from './normalize';

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

/**
 * Copy of `row` with one field replaced. A key that literally contains dots wins
 * over path splitting, matching `getValue`. The input row is not mutated.
 */
export function withFieldValue<TRow>(row: TRow, path: string, value: unknown): TRow {
  if (!isRecord(row)) return row;
  if (Object.prototype.hasOwnProperty.call(row, path) || path.indexOf('.') === -1) {
    return { ...row, [path]: value } as TRow;
  }
  const keys = path.split('.');
  const root: AnyRow = { ...row };
  let cursor = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    const child = cursor[key];
    const copy = isRecord(child) ? { ...child } : {};
    cursor[key] = copy;
    cursor = copy;
  }
  cursor[keys[keys.length - 1]!] = value;
  return root as TRow;
}

export type RowDraftResult<TRow> =
  { ok: true; nextRow: TRow } | { ok: false; errors: Record<string, true> };

/**
 * Validates changed drafts and builds the next row. Unchanged fields are left
 * alone, so a column `valueSetter` does not run unless that field was edited.
 */
export function applyRowDrafts<TRow>(
  row: TRow,
  columns: readonly EffectiveColumn<TRow>[],
  drafts: Readonly<Record<string, string | boolean>>,
  initial: Readonly<Record<string, string | boolean>>,
): RowDraftResult<TRow> {
  const errors: Record<string, true> = {};
  const changes: { column: EffectiveColumn<TRow>; value: unknown }[] = [];
  for (const column of columns) {
    if (!canEditColumn(column)) continue;
    const draft = drafts[column.id];
    if (draft === undefined || Object.is(draft, initial[column.id])) continue;
    const previous = getColumnValue(row, column);
    const parsed = parseEditedValue(column, previous, draft);
    if (!parsed.ok) errors[column.id] = true;
    else changes.push({ column, value: parsed.value });
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  let next = row;
  for (const change of changes) {
    if (change.column.valueSetter) {
      try {
        next = change.column.valueSetter(next, change.value);
      } catch {
        errors[change.column.id] = true;
        return { ok: false, errors };
      }
    } else if (change.column.field) {
      next = withFieldValue(next, change.column.field, change.value);
    }
  }
  return { ok: true, nextRow: next };
}
