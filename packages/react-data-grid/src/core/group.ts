import type { SortItem } from '../types';
import { getColumnValue, isEmptyValue, type ResolvedColumn } from './columns';
import { formatValue, toDate, toNumber, type FormatOptions } from './format';
import { sortIndexes } from './sort';

const PATH_SEP = '\u001f';

export interface DataDisplayItem {
  kind: 'data';
  index: number;
  depth: number;
}

export interface GroupDisplayItem {
  kind: 'group';
  /** Stable path: `columnId=token` segments joined so the same value at two levels stays distinct. */
  key: string;
  columnId: string;
  value: unknown;
  depth: number;
  /** Leaf records under this group, including descendants hidden by collapse. */
  count: number;
  expanded: boolean;
  /** Index of one child row, used only to format the group label. */
  sampleIndex: number;
}

export type DisplayItem = DataDisplayItem | GroupDisplayItem;

/** Grouped columns in grouping order: `rowGroupIndex`, then display order. */
export function resolveGroupColumns<TRow>(
  columns: readonly ResolvedColumn<TRow>[],
): ResolvedColumn<TRow>[] {
  return columns
    .filter((column) => column.rowGroup)
    .slice()
    .sort((a, b) => {
      const ia = a.rowGroupIndex ?? Number.MAX_SAFE_INTEGER;
      const ib = b.rowGroupIndex ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return columns.indexOf(a) - columns.indexOf(b);
    });
}

/**
 * Stable identity for a group value. Null, undefined, and `''` share one key.
 * Objects use a structural key, not reference identity.
 */
export function groupValueToken(value: unknown, column: ResolvedColumn): string {
  if (isEmptyValue(value)) return 'empty';
  if (typeof value === 'number' && !Number.isFinite(value)) return 'empty';
  if (typeof value === 'function' || typeof value === 'symbol') return 'empty';

  if (column.type === 'boolean' || typeof value === 'boolean') {
    if (value === true) return 'b:1';
    if (value === false) return 'b:0';
  }

  if (column.type === 'date' || value instanceof Date) {
    const date =
      value instanceof Date ? (Number.isNaN(value.getTime()) ? undefined : value) : toDate(value);
    if (date) return `d:${date.getTime()}`;
    if (column.type === 'date' || value instanceof Date) return 'empty';
  }

  if (
    column.type === 'number' ||
    column.type === 'currency' ||
    column.type === 'percent' ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    if (typeof value === 'bigint') return `i:${value.toString()}`;
    const n = typeof value === 'number' ? value : toNumber(value);
    if (typeof n === 'number' && Number.isFinite(n)) return `n:${Object.is(n, -0) ? 0 : n}`;
  }

  if (typeof value === 'string') return `s:${value}`;
  return `o:${stableSerialize(value)}`;
}

function stableSerialize(value: unknown, seen: WeakSet<object> = new WeakSet()): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `s:${value}`;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `n:${Object.is(value, -0) ? 0 : value}` : 'empty';
  }
  if (typeof value === 'boolean') return value ? 'b:1' : 'b:0';
  if (typeof value === 'bigint') return `i:${value.toString()}`;
  if (typeof value === 'function' || typeof value === 'symbol') return 'empty';
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 'empty' : `d:${time}`;
  }
  if (seen.has(value)) return 'circular';
  seen.add(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item, seen)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${key}:${stableSerialize(record[key], seen)}`).join(',')}}`;
}

export function groupPath(columnId: string, token: string, parentKey: string): string {
  const segment = `${columnId}=${token}`;
  return parentKey ? `${parentKey}${PATH_SEP}${segment}` : segment;
}

interface GroupNode {
  key: string;
  columnId: string;
  value: unknown;
  depth: number;
  childMap: Map<string, GroupNode>;
  childList: GroupNode[];
  leaves: number[];
}

function countLeaves(node: GroupNode): number {
  if (node.childList.length === 0) return node.leaves.length;
  let count = 0;
  for (const child of node.childList) count += countLeaves(child);
  return count;
}

function firstLeaf(node: GroupNode): number {
  if (node.leaves.length > 0) return node.leaves[0]!;
  for (const child of node.childList) {
    const leaf = firstLeaf(child);
    if (leaf >= 0) return leaf;
  }
  return -1;
}

export interface GroupBuildInput<TRow> {
  rows: readonly TRow[];
  /** Indexes already searched and filtered. */
  indexes: readonly number[];
  groupColumns: readonly ResolvedColumn<TRow>[];
  sort: readonly SortItem[];
  columns: readonly ResolvedColumn<TRow>[];
  locale?: string;
  collapsed: ReadonlySet<string>;
}

export interface GroupBuildResult {
  items: DisplayItem[];
  /** Data-row indexes currently visible, in grouped display order. */
  visibleLeafIndexes: number[];
}

/**
 * Groups filtered indexes, then flattens expanded groups.
 * Group columns sort first (their sort direction, or ascending). Other sorts
 * order records inside the innermost group. Empty values sort last, matching
 * the grid sort. Inputs are not mutated.
 */
export function buildGroupedItems<TRow>(input: GroupBuildInput<TRow>): GroupBuildResult {
  const { rows, groupColumns, collapsed } = input;
  if (groupColumns.length === 0) {
    return {
      items: input.indexes.map((index) => ({ kind: 'data', index, depth: 0 })),
      visibleLeafIndexes: input.indexes.slice(),
    };
  }

  const groupIds = new Set(groupColumns.map((column) => column.id));
  const groupSort: SortItem[] = groupColumns.map((column) => {
    const existing = input.sort.find((item) => item.columnId === column.id);
    return { columnId: column.id, direction: existing?.direction ?? 'asc' };
  });
  const rest = input.sort.filter((item) => !groupIds.has(item.columnId));
  const columnsForSort = input.columns.map((column) =>
    groupIds.has(column.id) && !column.sortable ? { ...column, sortable: true } : column,
  );
  const ordered = sortIndexes(
    rows,
    input.indexes,
    [...groupSort, ...rest],
    columnsForSort,
    input.locale,
  );

  const roots: GroupNode[] = [];
  const rootMap = new Map<string, GroupNode>();

  for (const index of ordered) {
    const row = rows[index] as TRow;
    let map = rootMap;
    let list = roots;
    let parentKey = '';
    for (let depth = 0; depth < groupColumns.length; depth++) {
      const column = groupColumns[depth]!;
      const value = getColumnValue(row, column);
      const token = groupValueToken(value, column);
      let node = map.get(token);
      if (!node) {
        node = {
          key: groupPath(column.id, token, parentKey),
          columnId: column.id,
          value,
          depth,
          childMap: new Map(),
          childList: [],
          leaves: [],
        };
        map.set(token, node);
        list.push(node);
      }
      if (depth === groupColumns.length - 1) node.leaves.push(index);
      else {
        parentKey = node.key;
        map = node.childMap;
        list = node.childList;
      }
    }
  }

  const items: DisplayItem[] = [];
  const visibleLeafIndexes: number[] = [];
  const walk = (nodes: readonly GroupNode[]) => {
    for (const node of nodes) {
      const expanded = !collapsed.has(node.key);
      items.push({
        kind: 'group',
        key: node.key,
        columnId: node.columnId,
        value: node.value,
        depth: node.depth,
        count: countLeaves(node),
        expanded,
        sampleIndex: firstLeaf(node),
      });
      if (!expanded) continue;
      if (node.childList.length > 0) walk(node.childList);
      else {
        for (const index of node.leaves) {
          items.push({ kind: 'data', index, depth: node.depth + 1 });
          visibleLeafIndexes.push(index);
        }
      }
    }
  };
  walk(roots);
  return { items, visibleLeafIndexes };
}

/** Group label. Empty values use `blank`. A column `format` is display-only. */
export function formatGroupValue<TRow>(
  value: unknown,
  column: ResolvedColumn<TRow>,
  sampleRow: TRow | undefined,
  opts: FormatOptions,
  blank: string,
): string {
  if (column.format) {
    try {
      const text = String(column.format(value, sampleRow as TRow) ?? '');
      if (text !== '') return text;
    } catch {
      return blank;
    }
  }
  const text = formatValue(value, column, opts);
  return text === '' ? blank : text;
}
