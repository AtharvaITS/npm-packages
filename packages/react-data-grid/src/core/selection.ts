import type { RowId, SelectionMode } from '../types';

/** Toggles one id, respecting the selection mode. */
export function toggle(selection: readonly RowId[], id: RowId, mode: SelectionMode): RowId[] {
  if (mode === 'none') return [];
  const has = selection.includes(id);
  if (mode === 'single') return has ? [] : [id];
  return has ? selection.filter((x) => x !== id) : [...selection, id];
}

/** Ids between anchor and target (inclusive) in the current display order. */
export function selectRange(
  orderedIds: readonly RowId[],
  anchor: RowId | null,
  target: RowId,
  isSelectable: (id: RowId) => boolean = () => true,
): RowId[] {
  const to = orderedIds.indexOf(target);
  if (to === -1) return [];
  const from = anchor === null ? -1 : orderedIds.indexOf(anchor);
  if (from === -1) return isSelectable(target) ? [target] : [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return orderedIds.slice(lo, hi + 1).filter(isSelectable);
}

/** Adds ids to an existing selection without duplicates. */
export function addRange(selection: readonly RowId[], range: readonly RowId[]): RowId[] {
  const set = new Set(selection);
  const out = [...selection];
  for (const id of range) {
    if (!set.has(id)) {
      set.add(id);
      out.push(id);
    }
  }
  return out;
}

export function selectAll(
  orderedIds: readonly RowId[],
  isSelectable: (id: RowId) => boolean = () => true,
): RowId[] {
  return orderedIds.filter(isSelectable);
}

/** Keeps only ids that still exist. Returns the same array when nothing changed. */
export function pruneSelection(
  selection: readonly RowId[],
  validIds: ReadonlySet<RowId>,
): readonly RowId[] {
  let changed = false;
  const out: RowId[] = [];
  for (const id of selection) {
    if (validIds.has(id)) out.push(id);
    else changed = true;
  }
  return changed ? out : selection;
}

export function headerState(
  selection: ReadonlySet<RowId>,
  orderedSelectableIds: readonly RowId[],
): 'none' | 'some' | 'all' {
  if (orderedSelectableIds.length === 0) return 'none';
  let count = 0;
  for (const id of orderedSelectableIds) if (selection.has(id)) count++;
  if (count === 0) return 'none';
  return count === orderedSelectableIds.length ? 'all' : 'some';
}
