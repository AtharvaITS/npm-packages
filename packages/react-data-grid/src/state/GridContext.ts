import { createContext, useContext, type KeyboardEvent, type MouseEvent } from 'react';
import type { EffectiveColumn } from '../core/columnState';
import type { FormatOptions } from '../core/format';
import type { ReactDataGridProps, ColumnStateItem, Messages, RowId, SelectionMode } from '../types';
import type { GridStateApi } from './useGridState';

export interface SelectionApi {
  mode: SelectionMode;
  selected: ReadonlySet<RowId>;
  isSelectable(rowIndex: number): boolean;
  /** Toggle one row; `range` extends from the anchor in multi mode. */
  toggleRow(rowIndex: number, options?: { range?: boolean }): void;
  headerState: 'none' | 'some' | 'all';
  selectAll(): void;
  clear(): void;
  /** Number of selectable rows matching the current search/filters. */
  selectableCount: number;
}

export interface ColumnActions {
  setWidth(id: string, width: number): void;
  setHidden(id: string, hidden: boolean): boolean;
  setPinned(id: string, pinned: 'start' | 'end' | null): void;
  move(id: string, targetId: string): void;
  moveBy(id: string, delta: -1 | 1): void;
  canResize: boolean;
  canReorder: boolean;
  canHide: boolean;
  canPin: boolean;
}

export interface GridContextValue<TRow = any> {
  props: ReactDataGridProps<TRow>;
  warnKey: object;
  rows: readonly TRow[];
  rowIds: readonly RowId[];
  /** All columns in display order with user column state applied. */
  columns: EffectiveColumn<TRow>[];
  visibleColumns: EffectiveColumn<TRow>[];
  columnState: ColumnStateItem[];
  messages: Messages;
  locale: string;
  rtl: boolean;
  formatOptions: FormatOptions;
  api: GridStateApi;
  serverMode: boolean;
  pagination: 'pages' | 'scroll';
  /** Row indexes (into `rows`) to display: the current page, or all matches when scrolling. */
  displayIndexes: readonly number[];
  /** Absolute 0-based position of displayIndexes[0] among all matching rows. */
  rowOffset: number;
  /** Total matching rows (all pages). */
  totalCount: number;
  /** Rows in the data before search/filters (client mode) or total count (server mode). */
  dataCount: number;
  selection: SelectionApi;
  columnActions: ColumnActions;
  activateRow(rowIndex: number, event: MouseEvent | KeyboardEvent): void;
  /** Open cell editor, or null when no cell is being edited. */
  editing: { rowId: RowId; columnId: string } | null;
  startEdit(rowIndex: number, columnId: string): void;
  /** Enter: parse the draft and call `onCellEdit` when the value is valid. */
  commitEdit(draft: string | boolean): void;
  cancelEdit(): void;
  announce(text: string): void;
  rowHeight: number;
  /** CSS height of the scroll area in scroll mode. */
  scrollHeight: number | string | undefined;
  titleColumn: EffectiveColumn<TRow> | undefined;
  subtitleColumn: EffectiveColumn<TRow> | undefined;
  imageColumn: EffectiveColumn<TRow> | undefined;
  cardFieldLimit: number;
  cardMinWidth: number;
  clearFilters(): void;
  hasActiveConditions: boolean;
  loading: boolean;
}

export const GridContext = createContext<GridContextValue | null>(null);

export function useGrid<TRow = any>(): GridContextValue<TRow> {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error('ReactDataGrid internals used outside the component.');
  return ctx as GridContextValue<TRow>;
}
