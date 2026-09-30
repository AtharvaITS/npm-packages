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
    const effective: EffectiveColumn<TRow> = {
      ...column,
      hidden: item?.hidden ?? column.hidden,
      pinned: pinned ?? null,
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
    const item: ColumnStateItem = { id: c.id, order, hidden: c.hidden, pinned: c.pinned };
    if (prev?.width !== undefined) item.width = prev.width;
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
