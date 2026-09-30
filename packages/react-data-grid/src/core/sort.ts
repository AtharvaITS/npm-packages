import type { SortItem } from '../types';
import { getColumnValue, isEmptyValue, type ResolvedColumn } from './columns';
import { toDate, toNumber } from './format';

const collators = new Map<string, Intl.Collator>();

export function getCollator(locale: string | undefined): Intl.Collator {
  const key = locale ?? '';
  let collator = collators.get(key);
  if (!collator) {
    try {
      collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    } catch {
      collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    }
    collators.set(key, collator);
  }
  return collator;
}

// Rank for mixed-type ordering: number < text < empty (research R7).
const RANK_NUMBER = 0;
const RANK_TEXT = 1;
const RANK_EMPTY = 2;

interface SortKey {
  rank: number;
  num: number;
  text: string;
}

function toSortKey(value: unknown, column: ResolvedColumn): SortKey {
  if (isEmptyValue(value) || (typeof value === 'number' && Number.isNaN(value))) {
    return { rank: RANK_EMPTY, num: 0, text: '' };
  }
  const type = column.type;
  if (type === 'date') {
    const d = toDate(value);
    if (d) return { rank: RANK_NUMBER, num: d.getTime(), text: '' };
  }
  if (type === 'number' || type === 'currency' || type === 'percent') {
    const n = toNumber(value);
    if (n !== undefined && !Number.isNaN(n)) return { rank: RANK_NUMBER, num: n, text: '' };
  }
  if (typeof value === 'number') return { rank: RANK_NUMBER, num: value, text: '' };
  if (typeof value === 'bigint') return { rank: RANK_NUMBER, num: Number(value), text: '' };
  if (typeof value === 'boolean') return { rank: RANK_NUMBER, num: value ? 1 : 0, text: '' };
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t)
      ? { rank: RANK_EMPTY, num: 0, text: '' }
      : { rank: RANK_NUMBER, num: t, text: '' };
  }
  if (typeof value === 'string') return { rank: RANK_TEXT, num: 0, text: value };
  let text = '';
  try {
    text = Array.isArray(value) ? value.join(', ') : String(value);
  } catch {
    text = '';
  }
  return { rank: RANK_TEXT, num: 0, text };
}

/**
 * Returns a new, stably sorted index array (FR-015 – FR-017). Empty values are
 * always last regardless of direction. The input arrays are not mutated.
 */
export function sortIndexes<TRow>(
  rows: readonly TRow[],
  indexes: readonly number[],
  sort: readonly SortItem[],
  columns: readonly ResolvedColumn<TRow>[],
  locale?: string,
): number[] {
  const active = sort
    .map((item) => ({ item, column: columns.find((c) => c.id === item.columnId) }))
    .filter(
      (x): x is { item: SortItem; column: ResolvedColumn<TRow> } => !!x.column && x.column.sortable,
    );
  if (active.length === 0) return indexes.slice();

  const collator = getCollator(locale);
  const n = indexes.length;
  // Precompute keys once per active column, aligned by position (fast comparator).
  const keyed = active.map(({ column, item }) => {
    const dir = item.direction === 'desc' ? -1 : 1;
    if (column.compare) {
      const values: unknown[] = new Array(n);
      for (let p = 0; p < n; p++) values[p] = getColumnValue(rows[indexes[p]!] as TRow, column);
      return {
        dir,
        custom: column.compare,
        values,
        rank: undefined,
        num: undefined,
        text: undefined,
      };
    }
    const rank = new Uint8Array(n);
    const num = new Float64Array(n);
    const text: string[] = new Array(n);
    for (let p = 0; p < n; p++) {
      const key = toSortKey(getColumnValue(rows[indexes[p]!] as TRow, column), column);
      rank[p] = key.rank;
      num[p] = key.num;
      text[p] = key.text;
    }
    return { dir, custom: undefined, values: undefined, rank, num, text };
  });

  const positions = new Array<number>(n);
  for (let p = 0; p < n; p++) positions[p] = p;
  positions.sort((a, b) => {
    for (const k of keyed) {
      let result = 0;
      if (k.custom) {
        const va = k.values![a];
        const vb = k.values![b];
        const ea = isEmptyValue(va);
        const eb = isEmptyValue(vb);
        if (ea || eb) {
          if (ea && eb) continue;
          return ea ? 1 : -1; // empty last in both directions
        }
        result = k.custom(va, vb, rows[indexes[a]!] as TRow, rows[indexes[b]!] as TRow) * k.dir;
      } else {
        const ra = k.rank![a]!;
        const rb = k.rank![b]!;
        if (ra === RANK_EMPTY || rb === RANK_EMPTY) {
          if (ra === rb) continue;
          return ra === RANK_EMPTY ? 1 : -1;
        }
        if (ra !== rb) {
          result = (ra - rb) * k.dir;
        } else if (ra === RANK_NUMBER) {
          const na = k.num![a]!;
          const nb = k.num![b]!;
          result = (na < nb ? -1 : na > nb ? 1 : 0) * k.dir;
        } else {
          result = collator.compare(k.text![a]!, k.text![b]!) * k.dir;
        }
      }
      if (result !== 0) return result;
    }
    return a - b; // stable: original position
  });
  return positions.map((p) => indexes[p]!);
}

/** Next sort state after a user toggles a column (data model §6.1). */
export function toggleSort(
  current: readonly SortItem[],
  columnId: string,
  additive: boolean,
): SortItem[] {
  const existing = current.find((s) => s.columnId === columnId);
  const nextDirection = !existing ? 'asc' : existing.direction === 'asc' ? 'desc' : null;
  if (!additive) return nextDirection ? [{ columnId, direction: nextDirection }] : [];
  if (!existing) return [...current, { columnId, direction: 'asc' }];
  if (!nextDirection) return current.filter((s) => s.columnId !== columnId);
  return current.map((s) => (s.columnId === columnId ? { columnId, direction: nextDirection } : s));
}
