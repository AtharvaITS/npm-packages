import { getColumnValue, type ResolvedColumn } from './columns';

const MARKS = /\p{M}/gu;

/** Case- and accent-insensitive folding: "José" → "jose". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(MARKS, '').toLowerCase();
}

/** Plain-text form of a raw value for searching (raw values, FR-021). */
export function rawText(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return '';
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
      return Number.isFinite(value) ? String(value) : '';
    case 'bigint':
    case 'boolean':
      return String(value);
    case 'function':
    case 'symbol':
      return '';
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (depth > 2) return '';
  try {
    if (Array.isArray(value)) return value.map((v) => rawText(v, depth + 1)).join(' ');
    return Object.values(value as Record<string, unknown>)
      .map((v) => rawText(v, depth + 1))
      .join(' ');
  } catch {
    return '';
  }
}

const cache = new WeakMap<object, { key: string; text: string }>();

/** Folded search text for a row across the given columns, cached per row object. */
export function buildSearchText<TRow>(
  row: TRow,
  columns: readonly ResolvedColumn<TRow>[],
  columnsKey: string,
): string {
  const obj = row as unknown as object;
  const hit = cache.get(obj);
  if (hit && hit.key === columnsKey) return hit.text;
  const parts: string[] = [];
  for (const column of columns) {
    const text = rawText(getColumnValue(row, column));
    if (text) parts.push(text);
  }
  const text = fold(parts.join('\u0001'));
  cache.set(obj, { key: columnsKey, text });
  return text;
}

/** Filters indexes to rows containing the query in any visible, searchable column. */
export function searchIndexes<TRow>(
  rows: readonly TRow[],
  indexes: readonly number[],
  query: string,
  columns: readonly ResolvedColumn<TRow>[],
): number[] {
  const needle = fold(query.trim());
  if (!needle) return indexes.slice();
  const searchable = columns.filter((c) => c.searchable && !c.hidden);
  if (searchable.length === 0) return [];
  const key = searchable.map((c) => c.id).join('\u0001');
  const out: number[] = [];
  for (const i of indexes) {
    if (buildSearchText(rows[i] as TRow, searchable, key).includes(needle)) out.push(i);
  }
  return out;
}
