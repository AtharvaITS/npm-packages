import type { ColumnStateItem } from '../types';
import type { ResolvedColumn, ResolvedType } from './columns';

const DEFAULT_WIDTHS: Record<ResolvedType, number> = {
  text: 180,
  enum: 150,
  number: 120,
  currency: 130,
  percent: 100,
  boolean: 100,
  date: 140,
  image: 96,
};

export interface EffectiveColumn<TRow = any> extends ResolvedColumn<TRow> {
  /** Resolved pixel width used for table layout. */
  layoutWidth: number;
  /** Whether the width was set explicitly (definition or user resize). */
  fixedWidth: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const GROUP = { start: 0, none: 1, end: 2 } as const;

/**
 * Merges user column state over resolved columns (data model §6, FR-038).
 * Returns every column in display order (pinned-start, unpinned, pinned-end)
 * and the visible subset. At least one column is always visible.
 */
export function applyColumnState<TRow>(
  columns: readonly ResolvedColumn<TRow>[],
  state: readonly ColumnStateItem[],
): { ordered: EffectiveColumn<TRow>[]; visible: EffectiveColumn<TRow>[] } {
  const byId = new Map(state.map((s) => [s.id, s]));
  const merged = columns.map((column, defIndex) => {
    const item = byId.get(column.id);
    const width = item?.width ?? column.width;
    const pinned = item && item.pinned !== undefined ? item.pinned : column.pinned;
    const rowGroup = item && item.rowGroup !== undefined ? item.rowGroup : column.rowGroup;
    const rowGroupIndex =
      item && item.rowGroupIndex !== undefined ? item.rowGroupIndex : column.rowGroupIndex;
    const effective: EffectiveColumn<TRow> = {
      ...column,
      hidden: item?.hidden ?? column.hidden,
      pinned: pinned ?? null,
      rowGroup,
      rowGroupIndex: rowGroup ? rowGroupIndex : undefined,
      width,
      layoutWidth: clamp(width ?? DEFAULT_WIDTHS[column.type], column.minWidth, column.maxWidth),
      fixedWidth: width !== undefined,
    };
    return { effective, order: item ? item.order : defIndex, defIndex, hasState: !!item };
  });

  merged.sort((a, b) => {
    const ga = GROUP[a.effective.pinned ?? 'none'];
    const gb = GROUP[b.effective.pinned ?? 'none'];
    if (ga !== gb) return ga - gb;
    // Columns with state use its order; others keep their definition position.
    const oa = a.hasState ? a.order : a.defIndex;
    const ob = b.hasState ? b.order : b.defIndex;
    return oa !== ob ? oa - ob : a.defIndex - b.defIndex;
  });

  const ordered = merged.map((m) => m.effective);
  let visible = ordered.filter((c) => !c.hidden);
  if (visible.length === 0 && ordered.length > 0) {
    ordered[0] = { ...ordered[0]!, hidden: false };
    visible = [ordered[0]!];
  }
  return { ordered, visible };
}

/** Full state snapshot from the current effective order, for modification. */
export function snapshotState(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
): ColumnStateItem[] {
  const byId = new Map(state.map((s) => [s.id, s]));
  return ordered.map((c, order) => {
    const prev = byId.get(c.id);
    const item: ColumnStateItem = {
      id: c.id,
      order,
      hidden: c.hidden,
      pinned: c.pinned,
      rowGroup: c.rowGroup,
    };
    if (prev?.width !== undefined) item.width = prev.width;
    if (c.rowGroup && c.rowGroupIndex !== undefined) item.rowGroupIndex = c.rowGroupIndex;
    return item;
  });
}

export function setColumnWidth(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  width: number,
): ColumnStateItem[] {
  const column = ordered.find((c) => c.id === id);
  if (!column) return [...state];
  const w = Math.round(clamp(width, column.minWidth, column.maxWidth));
  return snapshotState(ordered, state).map((s) => (s.id === id ? { ...s, width: w } : s));
}

/** Returns null when hiding would leave no visible column (data model §6.2). */
export function setColumnHidden(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  hidden: boolean,
): ColumnStateItem[] | null {
  if (hidden) {
    const visibleCount = ordered.filter((c) => !c.hidden && c.id !== id).length;
    if (visibleCount === 0) return null;
  }
  return snapshotState(ordered, state).map((s) => (s.id === id ? { ...s, hidden } : s));
}

export function setColumnPinned(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  pinned: 'start' | 'end' | null,
): ColumnStateItem[] {
  return snapshotState(ordered, state).map((s) => (s.id === id ? { ...s, pinned } : s));
}

/** Moves a column to another column's position (drag and drop, "move left/right"). */
export function moveColumn(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  targetId: string,
): ColumnStateItem[] {
  const snap = snapshotState(ordered, state);
  const from = snap.findIndex((s) => s.id === id);
  const to = snap.findIndex((s) => s.id === targetId);
  if (from === -1 || to === -1 || from === to) return snap;
  const moving = ordered[from]!;
  const target = ordered[to]!;
  if (!moving.reorderable || !target.reorderable) return snap;
  const [item] = snap.splice(from, 1);
  // Moving into another pin group adopts that group.
  snap.splice(to, 0, { ...item!, pinned: target.pinned });
  return snap.map((s, order) => ({ ...s, order }));
}

/** Writes dense 0-based `rowGroupIndex` values in current grouping order. */
function compactGroupIndexes(items: readonly ColumnStateItem[]): ColumnStateItem[] {
  const grouped = items
    .filter((item) => item.rowGroup)
    .sort((a, b) => {
      const ia = a.rowGroupIndex ?? Number.MAX_SAFE_INTEGER;
      const ib = b.rowGroupIndex ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.order - b.order;
    });
  const indexOf = new Map(grouped.map((item, index) => [item.id, index]));
  return items.map((item) => {
    if (!item.rowGroup) {
      if (item.rowGroupIndex === undefined) return { ...item, rowGroup: false };
      const { rowGroupIndex: _dropped, ...rest } = item;
      return { ...rest, rowGroup: false };
    }
    return { ...item, rowGroup: true, rowGroupIndex: indexOf.get(item.id) ?? 0 };
  });
}

/** Adds or removes a column from row grouping. New groups are appended. */
export function setColumnRowGroup(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  rowGroup: boolean,
): ColumnStateItem[] {
  if (!ordered.some((column) => column.id === id)) return [...state];
  const snap = snapshotState(ordered, state).map((item) => {
    if (item.id !== id) return item;
    if (!rowGroup) {
      const { rowGroupIndex: _dropped, ...rest } = item;
      return { ...rest, rowGroup: false };
    }
    return { ...item, rowGroup: true };
  });
  return compactGroupIndexes(snap);
}

/**
 * Drops a column into the grouping order.
 * `beforeId` inserts before that grouped column; `null` appends.
 */
export function placeRowGroup(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  beforeId: string | null,
): ColumnStateItem[] {
  const column = ordered.find((item) => item.id === id);
  if (!column || !column.groupable || beforeId === id) return [...state];
  const snap = compactGroupIndexes(snapshotState(ordered, state));
  const ids = snap
    .filter((item) => item.rowGroup && item.id !== id)
    .sort((a, b) => (a.rowGroupIndex ?? 0) - (b.rowGroupIndex ?? 0))
    .map((item) => item.id);
  let index = ids.length;
  if (beforeId && beforeId !== id) {
    const at = ids.indexOf(beforeId);
    index = at === -1 ? ids.length : at;
  }
  ids.splice(index, 0, id);
  const indexOf = new Map(ids.map((groupId, position) => [groupId, position]));
  return snap.map((item) =>
    indexOf.has(item.id)
      ? { ...item, rowGroup: true, rowGroupIndex: indexOf.get(item.id) }
      : item,
  );
}

/** Moves a grouped column earlier (`-1`) or later (`1`) in the grouping order. */
export function moveRowGroup(
  ordered: readonly EffectiveColumn[],
  state: readonly ColumnStateItem[],
  id: string,
  delta: -1 | 1,
): ColumnStateItem[] {
  const snap = compactGroupIndexes(snapshotState(ordered, state));
  const grouped = snap
    .filter((item) => item.rowGroup)
    .sort((a, b) => (a.rowGroupIndex ?? 0) - (b.rowGroupIndex ?? 0));
  const index = grouped.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= grouped.length) return snap;
  const next = grouped.slice();
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  const indexOf = new Map(next.map((item, position) => [item.id, position]));
  return snap.map((item) =>
    item.rowGroup ? { ...item, rowGroupIndex: indexOf.get(item.id) ?? item.rowGroupIndex } : item,
  );
}

/** Neighbour in visible display order, for "Move left/right". */
export function neighbourId(
  visible: readonly EffectiveColumn[],
  id: string,
  delta: -1 | 1,
): string | undefined {
  const index = visible.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  return visible[index + delta]?.id;
}
