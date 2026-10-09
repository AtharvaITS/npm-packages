import { warn } from '../dev/warn';
import type { ColumnDef, ColumnType } from '../types';
import { getValue, isRecord } from './normalize';

export type ResolvedType = Exclude<ColumnType, 'auto'>;

/** A column with every default applied (data model §4). Internal. */
export interface ResolvedColumn<TRow = any> extends ColumnDef<TRow> {
  id: string;
  header: string;
  type: ResolvedType;
  minWidth: number;
  maxWidth: number;
  align: 'start' | 'center' | 'end';
  hidden: boolean;
  pinned: 'start' | 'end' | null;
  sortable: boolean;
  filterable: boolean;
  searchable: boolean;
  resizable: boolean;
  reorderable: boolean;
  hideable: boolean;
  rowGroup: boolean;
  groupable: boolean;
  /** The column definition as supplied (or derived), for render contexts. */
  def: ColumnDef<TRow>;
}

const DEFAULT_MIN_WIDTH = 60;
const DEFAULT_MAX_WIDTH = 800;
const TYPE_SAMPLE = 100;
const ENUM_LIMIT = 20;
const IMAGE_RE = /^(data:image\/|https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?\S*)?$)/i;

/** `firstName` → "First Name", `snake_case` → "Snake Case", `address.city` → "Address City". */
export function humanizeHeader(field: string): string {
  return field
    .replace(/[._\-\s]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Union of top-level keys in first-seen order. */
export function deriveColumns(rows: readonly unknown[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Infers a column type from the first 100 non-empty values. Strings are never
 * inferred as numbers or dates (the developer must declare `type`); strings
 * that are all image URLs / data URIs are inferred as `image`.
 */
export function inferType(values: Iterable<unknown>): ResolvedType {
  let count = 0;
  let allNumber = true;
  let allBoolean = true;
  let allDate = true;
  let allImage = true;
  for (const value of values) {
    if (isEmptyValue(value)) continue;
    count++;
    if (typeof value !== 'number') allNumber = false;
    if (typeof value !== 'boolean') allBoolean = false;
    if (!(value instanceof Date)) allDate = false;
    if (typeof value !== 'string' || !IMAGE_RE.test(value)) allImage = false;
    if (count >= TYPE_SAMPLE) break;
  }
  if (count === 0) return 'text';
  if (allNumber) return 'number';
  if (allBoolean) return 'boolean';
  if (allDate) return 'date';
  if (allImage) return 'image';
  return 'text';
}

export function getColumnValue<TRow>(row: TRow, column: ColumnDef<TRow>): unknown {
  if (column.valueGetter) {
    try {
      return column.valueGetter(row);
    } catch {
      return undefined;
    }
  }
  return column.field !== undefined ? getValue(row, column.field) : undefined;
}

function* columnValues<TRow>(rows: readonly TRow[], column: ColumnDef<TRow>) {
  for (const row of rows) yield getColumnValue(row, column);
}

function collectEnumValues<TRow>(
  rows: readonly TRow[],
  column: ColumnDef<TRow>,
): unknown[] | undefined {
  const distinct = new Set<unknown>();
  for (const value of columnValues(rows, column)) {
    if (isEmptyValue(value)) continue;
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    distinct.add(value);
    if (distinct.size > ENUM_LIMIT) return undefined;
  }
  // Only worth a pick list when values actually repeat.
  if (distinct.size === 0 || distinct.size * 2 > rows.length) return undefined;
  return Array.from(distinct).sort((a, b) => String(a).localeCompare(String(b)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Applies all column defaults (data model §4) and derives columns when none are given. */
export function resolveColumns<TRow>(
  defs: readonly ColumnDef<TRow>[] | undefined,
  rows: readonly TRow[],
  warnKey?: object,
): ResolvedColumn<TRow>[] {
  const source: ColumnDef<TRow>[] = defs
    ? [...defs]
    : deriveColumns(rows).map((field) => ({ field }));
  const usedIds = new Set<string>();
  const result: ResolvedColumn<TRow>[] = [];

  for (const def of source) {
    let id = def.id ?? def.field;
    if (id === undefined || id === '') {
      warn(warnKey, 'A column has neither `field` nor `id` and was skipped.');
      continue;
    }
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}__${n}`)) n++;
      warn(warnKey, `Duplicate column id "${id}"; renamed to "${id}__${n}".`);
      id = `${id}__${n}`;
    }
    usedIds.add(id);

    const type: ResolvedType =
      def.type && def.type !== 'auto' ? def.type : inferType(columnValues(rows, def));
    const minWidth = def.minWidth ?? DEFAULT_MIN_WIDTH;
    const maxWidth = Math.max(minWidth, def.maxWidth ?? DEFAULT_MAX_WIDTH);
    const width = def.width !== undefined ? clamp(def.width, minWidth, maxWidth) : undefined;
    const numeric = type === 'number' || type === 'currency' || type === 'percent';
    const enumValues =
      def.enumValues ??
      (type === 'text' || type === 'enum' ? collectEnumValues(rows, def) : undefined);

    result.push({
      ...def,
      def,
      id,
      header: def.header ?? humanizeHeader(def.field ?? id),
      type,
      width,
      minWidth,
      maxWidth,
      align: def.align ?? (numeric ? 'end' : 'start'),
      hidden: def.hidden ?? false,
      pinned: def.pinned ?? null,
      sortable: def.sortable ?? true,
      filterable: def.filterable ?? true,
      searchable: def.searchable ?? type !== 'image',
      resizable: def.resizable ?? true,
      reorderable: def.reorderable ?? true,
      hideable: def.hideable ?? true,
      rowGroup: def.rowGroup ?? false,
      groupable: def.groupable ?? true,
      enumValues,
    });
  }
  return result;
}
