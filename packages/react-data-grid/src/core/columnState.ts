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

const PIN_GROUP = { start: 0, none: 1, end: 2 } as const;

interface RankedColumn<TRow> {
  effective: EffectiveColumn<TRow>;
  defIndex: number;
  /** 1-based column number, when `order` is a real position. */
  columnNumber: number | undefined;
}

/**
 * `order` is a column number starting at 1. Zero, negatives, and other
 * non-positive values are not positions.
 */
function columnNumber(order: number | undefined): number | undefined {
  if (order === undefined || !Number.isFinite(order) || order < 1) return undefined;
  return Math.floor(order);
}

/**
 * Puts each column in its 1-based slot.
 * Columns without a valid order keep definition order in the open slots.
 * When two columns ask for the same number, the earlier definition wins it.
 */
function placeByOrder<TRow>(entries: RankedColumn<TRow>[]): RankedColumn<TRow>[] {
  const count = entries.length;
  if (count === 0) return [];
  const slots: Array<RankedColumn<TRow> | undefined> = Array.from({ length: count });
  const placed = new Set<RankedColumn<TRow>>();
  const explicit = entries
    .filter((entry) => entry.columnNumber !== undefined)
    .sort((a, b) => a.defIndex - b.defIndex);
  for (const entry of explicit) {
    const index = Math.min(entry.columnNumber!, count) - 1;
    if (slots[index] === undefined) {
      slots[index] = entry;
      placed.add(entry);
    }
  }
  const unplaced = entries
    .filter((entry) => !placed.has(entry))
    .sort((a, b) => a.defIndex - b.defIndex);
  let cursor = 0;
  return slots.map((slot) => slot ?? unplaced[cursor++]!);
}

/**
 * Column numbers count the columns that are shown. A hidden column with no
 * order does not take a number, so `order: 4` is the fourth visible column.
 * Pinned columns still group at the start or end after that.
 */
function arrangeColumns<TRow>(entries: RankedColumn<TRow>[]): RankedColumn<TRow>[] {
  const participants = entries.filter((entry) => !entry.effective.hidden || entry.columnNumber !== undefined);
  const bystanders = entries.filter((entry) => entry.effective.hidden && entry.columnNumber === undefined);
  const arranged = placeByOrder(participants);
  const hidden = [...bystanders].sort((a, b) => b.defIndex - a.defIndex);
  for (const entry of hidden) arranged.splice(Math.min(entry.defIndex, arranged.length), 0, entry);
  arranged.sort(
    (a, b) => PIN_GROUP[a.effective.pinned ?? 'none'] - PIN_GROUP[b.effective.pinned ?? 'none'],
  );
  return arranged;
}

/**
 * Merges user column state over resolved columns (data model §6, FR-038).
 * Returns every column in display order (pinned-start, unpinned, pinned-end)
 * and the visible subset. At least one column is always visible.
 * `order` is a 1-based visible column number. `0` and negative numbers do not move the column.
 * Hidden columns that have no order do not use up a number.
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
    return { effective, defIndex, columnNumber: columnNumber(item?.order) };
  });

  const ordered = arrangeColumns(merged).map((entry) => entry.effective);
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
  return ordered.map((c, index) => {
    const prev = byId.get(c.id);
    const item: ColumnStateItem = { id: c.id, order: index + 1, hidden: c.hidden, pinned: c.pinned };
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
  return snap.map((s, index) => ({ ...s, order: index + 1 }));
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
