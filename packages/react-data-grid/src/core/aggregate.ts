import type { AggregateFunc } from '../types';
import { getColumnValue, type ResolvedColumn } from './columns';
import { formatValue, toNumber, type FormatOptions } from './format';

const NOISE_SCALE = 1e10;

/** Columns that opted into a numeric total. Non-numeric `aggregate` values are already dropped. */
export function aggregateColumns<TRow>(
  columns: readonly ResolvedColumn<TRow>[],
): ResolvedColumn<TRow>[] {
  return columns.filter((column) => column.aggregate === 'sum');
}

export function createAggregateTotals(
  columns: readonly { id: string }[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const column of columns) totals[column.id] = 0;
  return totals;
}

/** Adds `source` into `target`. Both objects are totals, not row records. */
export function addAggregateTotals(
  target: Record<string, number>,
  source: Record<string, number>,
): void {
  for (const id of Object.keys(source)) {
    target[id] = (target[id] ?? 0) + (source[id] ?? 0);
  }
}

/**
 * Adds one row's numeric values into `totals`.
 * Null, missing, and non-finite values are skipped. The row is not modified.
 */
export function addRowToTotals<TRow>(
  totals: Record<string, number>,
  row: TRow,
  columns: readonly ResolvedColumn<TRow>[],
): void {
  for (const column of columns) {
    const value = toSummand(getColumnValue(row, column));
    if (value === undefined) continue;
    const func = column.aggregate;
    if (func === undefined) continue;
    totals[column.id] = reduceAggregate(func, totals[column.id] ?? 0, value);
  }
}

export function addRowsToTotals<TRow>(
  totals: Record<string, number>,
  rows: readonly TRow[],
  indexes: readonly number[],
  columns: readonly ResolvedColumn<TRow>[],
): void {
  for (const index of indexes) {
    const row = rows[index];
    if (row === undefined) continue;
    addRowToTotals(totals, row, columns);
  }
}

/** Copy with binary float noise removed (`0.1 + 0.2` stays `0.3`). */
export function finalizeAggregateTotals(totals: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const id of Object.keys(totals)) next[id] = stabilize(totals[id] ?? 0);
  return next;
}

/** Group-row text. Uses `format` when it can, otherwise the column's type formatting. */
export function formatAggregateValue<TRow>(
  sum: number,
  column: ResolvedColumn<TRow>,
  opts: FormatOptions = {},
): string {
  if (column.format) {
    try {
      const text = column.format(sum, undefined as TRow);
      if (text !== undefined && text !== null) return String(text);
    } catch {
      // A formatter that needs the source row does not apply to a group total.
    }
  }
  return formatValue(sum, column, opts);
}

function reduceAggregate(func: AggregateFunc, current: number, value: number): number {
  switch (func) {
    case 'sum':
      return current + value;
    default: {
      const _exhaustive: never = func;
      return _exhaustive;
    }
  }
}

/** Finite numbers only. Strings use the same conversion as numeric columns. */
function toSummand(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof value === 'string') {
    const n = toNumber(value);
    return n !== undefined && Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function stabilize(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * NOISE_SCALE) / NOISE_SCALE;
  return Object.is(rounded, -0) ? 0 : rounded;
}
