import { warn } from '../dev/warn';

export type AnyRow = Record<string, unknown>;

export interface NormalizedData<TRow = AnyRow> {
  rows: TRow[];
  /** Index of each kept row in the array supplied by the host. */
  sourceIndexes: number[];
}

const EMPTY: NormalizedData<any> = Object.freeze({ rows: [], sourceIndexes: [] }) as any;

export function isRecord(value: unknown): value is AnyRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the `data` prop (data model §1–§2). Never mutates the input.
 * - null / undefined → []
 * - non-array → [] with a dev warning
 * - non-object items are dropped with one dev warning
 */
export function normalizeData<TRow>(input: unknown, warnKey?: object): NormalizedData<TRow> {
  if (input === null || input === undefined) return EMPTY;
  if (!Array.isArray(input)) {
    warn(warnKey, `data must be an array; received ${describeType(input)}. Showing no rows.`);
    return EMPTY;
  }
  const rows: TRow[] = [];
  const sourceIndexes: number[] = [];
  const invalid: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (isRecord(item)) {
      rows.push(item as TRow);
      sourceIndexes.push(i);
    } else {
      invalid.push(i);
    }
  }
  if (invalid.length > 0) {
    const shown = invalid.slice(0, 10).join(', ') + (invalid.length > 10 ? ', …' : '');
    warn(
      warnKey,
      `Skipped ${invalid.length} invalid rows at indexes ${shown}. Rows must be objects.`,
    );
  }
  return { rows, sourceIndexes };
}

function describeType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Reads a value by dot path. A key that literally contains dots wins over path
 * splitting when it exists on the row.
 */
export function getValue(row: unknown, path: string): unknown {
  if (!isRecord(row)) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, path)) return row[path];
  if (path.indexOf('.') === -1) return undefined;
  let current: unknown = row;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as AnyRow)[segment];
  }
  return current;
}

export type GetRowId<TRow> = string | ((row: TRow, index: number) => string | number) | undefined;

/**
 * Resolves a stable id for every row (research R11). If any declared id is
 * missing or duplicated, the whole data set falls back to index identity.
 */
export function resolveRowIds<TRow>(
  rows: readonly TRow[],
  sourceIndexes: readonly number[],
  getRowId: GetRowId<TRow>,
  warnKey?: object,
): string[] {
  const indexIds = () => sourceIndexes.map((i) => String(i));
  if (getRowId === undefined || getRowId === null || getRowId === '') return indexIds();

  const ids: string[] = new Array(rows.length);
  const seen = new Set<string>();
  const conflicts: string[] = [];
  let missing = 0;
  for (let i = 0; i < rows.length; i++) {
    const raw =
      typeof getRowId === 'function'
        ? getRowId(rows[i] as TRow, sourceIndexes[i] ?? i)
        : getValue(rows[i], getRowId);
    if (
      raw === null ||
      raw === undefined ||
      raw === '' ||
      (typeof raw !== 'string' && typeof raw !== 'number')
    ) {
      missing++;
      ids[i] = '';
      continue;
    }
    const id = String(raw);
    if (seen.has(id)) conflicts.push(id);
    seen.add(id);
    ids[i] = id;
  }
  if (missing > 0 || conflicts.length > 0) {
    const parts: string[] = [];
    if (missing > 0) parts.push(`${missing} rows have no id`);
    if (conflicts.length > 0) {
      const unique = Array.from(new Set(conflicts));
      parts.push(
        `duplicate ids: ${unique.slice(0, 10).join(', ')}${unique.length > 10 ? ', …' : ''}`,
      );
    }
    warn(
      warnKey,
      `getRowId produced invalid ids (${parts.join('; ')}). Falling back to row positions; selection may not survive data changes.`,
    );
    return indexIds();
  }
  return ids;
}
