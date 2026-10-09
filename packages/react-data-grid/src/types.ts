import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';

/** Stable identifier of a row. Always a string internally. */
export type RowId = string;

export type ViewType = 'table' | 'grid' | 'list';

export type ColumnType =
  'auto' | 'text' | 'number' | 'currency' | 'percent' | 'boolean' | 'date' | 'image' | 'enum';

export type SortDirection = 'asc' | 'desc';

export interface SortItem {
  columnId: string;
  direction: SortDirection;
}

export type FilterOperator =
  // text / enum
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  // number / currency / percent
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  // date
  | 'before'
  | 'after'
  | 'on'
  // shared
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty'
  // boolean
  | 'isTrue'
  | 'isFalse';

export interface FilterCondition {
  columnId: string;
  operator: FilterOperator;
  value?: unknown;
  /** Upper bound for `between` (inclusive). */
  value2?: unknown;
}

export type SelectionMode = 'none' | 'single' | 'multi';

/** Reduction shown on a group row. Only numeric columns (`number`, `currency`, `percent`) are aggregated. */
export type AggregateFunc = 'sum';

export interface ColumnStateItem {
  id: string;
  width?: number;
  hidden?: boolean;
  pinned?: 'start' | 'end' | null;
  order: number;
  /** When set, overrides the column definition's `rowGroup`. */
  rowGroup?: boolean;
  /** 0-based grouping level. Lower indexes are outer groups. */
  rowGroupIndex?: number;
}

export interface GridState {
  view: ViewType;
  sort: SortItem[];
  filters: FilterCondition[];
  search: string;
  page: number;
  pageSize: number;
  selection: RowId[];
  columnState: ColumnStateItem[];
}

export interface DataRequest {
  requestId: number;
  page: number;
  pageSize: number;
  sort: SortItem[];
  filters: FilterCondition[];
  search: string;
}

export interface FetchDataOptions {
  signal: AbortSignal;
}

export interface DataPage<TRow = Record<string, unknown>> {
  rows: TRow[];
  totalCount: number;
}

export type Density = 'compact' | 'standard' | 'comfortable';
export type ColorScheme = 'light' | 'dark' | 'auto';

export type ThemeToken =
  | 'colorBg'
  | 'colorSurface'
  | 'colorSurfaceAlt'
  | 'colorBorder'
  | 'colorText'
  | 'colorTextMuted'
  | 'colorAccent'
  | 'colorAccentText'
  | 'colorSelectedBg'
  | 'colorFocusRing'
  | 'colorDanger'
  | 'fontFamily'
  | 'fontSize'
  | 'radius'
  | 'spacing'
  | 'rowHeight'
  | 'headerHeight'
  | 'cardGap'
  | 'shadow';

export interface Theme {
  colorScheme?: ColorScheme;
  density?: Density;
  tokens?: Partial<Record<ThemeToken, string>>;
}

export interface Messages {
  searchPlaceholder: string;
  searchLabel: string;
  clearSearch: string;
  clearAll: string;
  viewTable: string;
  viewGrid: string;
  viewList: string;
  viewSwitcherLabel: string;
  empty: string;
  noResults: string;
  loading: string;
  error: string;
  retry: string;
  rowsPerPage: string;
  pageRange: (from: number, to: number, total: number) => string;
  resultsCount: (count: number) => string;
  selectedCount: (count: number) => string;
  selectAll: string;
  selectRow: string;
  deselectRow: string;
  sortAscending: string;
  sortDescending: string;
  sortNone: string;
  filter: string;
  addFilter: string;
  removeFilter: string;
  operators: Record<FilterOperator, string>;
  columns: string;
  hideColumn: string;
  showColumn: string;
  pinStart: string;
  pinEnd: string;
  unpin: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  yes: string;
  no: string;
  // Added in v0.1 (minor): remaining built-in UI text.
  moveLeft: string;
  moveRight: string;
  columnMenu: (header: string) => string;
  sortBy: string;
  filterColumn: string;
  filterOperator: string;
  filterValue: string;
  filterValueTo: string;
  selectAllMatching: (count: number) => string;
  allOnPageSelected: (count: number) => string;
  clearSelection: string;
  pageStatus: (page: number, pageCount: number) => string;
  resizeColumn: string;
  groupByColumn: string;
  ungroupColumn: string;
  moveGroupUp: string;
  moveGroupDown: string;
  /** Label for a group whose value is null, undefined, or empty. */
  blankGroup: string;
  groupCount: (count: number) => string;
  rowGroupPanelLabel: string;
  rowGroupDropHint: string;
  removeRowGroup: (header: string) => string;
}

export interface CellContext<TRow = Record<string, unknown>> {
  row: TRow;
  rowId: RowId;
  value: unknown;
  formattedValue: string;
  column: ColumnDef<TRow>;
  view: ViewType;
  selected: boolean;
}

export interface CardField<TRow = Record<string, unknown>> {
  column: ColumnDef<TRow>;
  value: unknown;
  formattedValue: string;
  content: ReactNode;
}

export interface CardContext<TRow = Record<string, unknown>> {
  row: TRow;
  rowId: RowId;
  selected: boolean;
  toggleSelected(): void;
  fields: CardField<TRow>[];
}

export type ListItemContext<TRow = Record<string, unknown>> = CardContext<TRow>;

/** A committed double-click edit. The grid does not write this into `data`. */
export interface CellEdit<TRow = Record<string, unknown>> {
  row: TRow;
  rowId: RowId;
  columnId: string;
  /** `field`, or the column id when the column is edited only through `valueSetter`. */
  field: string;
  previousValue: unknown;
  value: unknown;
  /** Row returned by `valueSetter`, when the column defines one. */
  nextRow?: TRow;
}

export interface ColumnDef<TRow = Record<string, unknown>> {
  /** Dot path, e.g. "address.city". */
  field?: string;
  /** Defaults to `field`; required with `valueGetter` when there is no field. */
  id?: string;
  header?: string;
  type?: ColumnType;
  valueGetter?: (row: TRow) => unknown;
  /**
   * Builds the row after an in-place edit. Required for columns that use
   * `valueGetter` (or omit `field`); the grid passes the result as `CellEdit.nextRow`.
   */
  valueSetter?: (row: TRow, value: unknown) => TRow;
  format?: (value: unknown, row: TRow) => string;
  formatOptions?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions & { currency?: string };
  render?: (ctx: CellContext<TRow>) => ReactNode;
  compare?: (a: unknown, b: unknown, rowA: TRow, rowB: TRow) => number;
  enumValues?: readonly unknown[];
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'start' | 'center' | 'end';
  hidden?: boolean;
  pinned?: 'start' | 'end' | null;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  hideable?: boolean;
  /**
   * Group rows by this column. Order is `rowGroupIndex` (lower is outer),
   * then the column's display order when the index is omitted.
   */
  rowGroup?: boolean;
  /** 0-based grouping level. Lower indexes are outer groups. */
  rowGroupIndex?: number;
  /** When false, the column menu cannot group by this column. Defaults to true. */
  groupable?: boolean;
  /**
   * Total to show on each group row. `sum` adds the column's numeric values.
   * Ignored unless the column type is `number`, `currency`, or `percent`.
   * Totals are display-only and are not written onto the source rows.
   */
  aggregate?: AggregateFunc;
}

export interface StateContentContext {
  messages: Messages;
  clearFilters?: () => void;
  retry?: () => void;
  error?: unknown;
}

export type StateContent = ReactNode | ((ctx: StateContentContext) => ReactNode);

export interface ReactDataGridProps<TRow = Record<string, unknown>> {
  // ---- Data --------------------------------------------------------------
  data?: readonly TRow[] | null;
  getRowId?: (keyof TRow & string) | string | ((row: TRow, index: number) => string | number);
  columns?: ColumnDef<TRow>[];
  dataMode?: 'client' | 'server';
  fetchData?: (req: DataRequest, opts: FetchDataOptions) => Promise<DataPage<TRow>>;
  onDataRequest?: (req: DataRequest) => void;
  totalCount?: number;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;

  // ---- Views -------------------------------------------------------------
  view?: ViewType;
  defaultView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  views?: ViewType[];
  showViewSwitcher?: boolean;
  titleField?: string;
  subtitleField?: string;
  imageField?: string;
  cardMinWidth?: number;
  cardFieldLimit?: number;
  renderCard?: (ctx: CardContext<TRow>) => ReactNode;
  renderListItem?: (ctx: ListItemContext<TRow>) => ReactNode;

  // ---- Sort / search / filter -------------------------------------------
  sort?: SortItem[];
  defaultSort?: SortItem[];
  onSortChange?: (sort: SortItem[]) => void;
  multiSort?: boolean;
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  searchable?: boolean;
  searchDebounceMs?: number;
  filters?: FilterCondition[];
  defaultFilters?: FilterCondition[];
  onFiltersChange?: (filters: FilterCondition[]) => void;
  filterable?: boolean;

  // ---- Pagination / scrolling -------------------------------------------
  pagination?: 'pages' | 'scroll';
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  defaultPageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  height?: number | string;

  // ---- Selection / interaction ------------------------------------------
  selectionMode?: SelectionMode;
  selection?: RowId[];
  defaultSelection?: RowId[];
  onSelectionChange?: (ids: RowId[], rows: TRow[]) => void;
  isRowSelectable?: (row: TRow) => boolean;
  onRowActivate?: (row: TRow, id: RowId, event: MouseEvent | KeyboardEvent) => void;
  /**
   * Called when a double-clicked cell is saved with Enter.
   * The parent updates `data` or sends the value to an API. Escape and blur do not call this.
   */
  onCellEdit?: (edit: CellEdit<TRow>) => void;

  // ---- Columns / persistence --------------------------------------------
  columnState?: ColumnStateItem[];
  defaultColumnState?: ColumnStateItem[];
  onColumnStateChange?: (state: ColumnStateItem[]) => void;
  enableColumnResize?: boolean;
  enableColumnReorder?: boolean;
  enableColumnHide?: boolean;
  enableColumnPin?: boolean;
  /**
   * Shows Group / Ungroup in the column menu so grouping can change at runtime.
   * Columns with `rowGroup` still group when this is omitted.
   */
  enableRowGrouping?: boolean;
  persistStateKey?: string;
  onStateChange?: (state: GridState, changed: keyof GridState) => void;

  // ---- Appearance / localization ----------------------------------------
  theme?: Theme;
  locale?: string;
  direction?: 'ltr' | 'rtl' | 'auto';
  messages?: Partial<Messages>;
  emptyContent?: StateContent;
  noResultsContent?: StateContent;
  loadingContent?: StateContent;
  errorContent?: StateContent;
  className?: string;
  style?: CSSProperties;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}
