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

export interface ColumnStateItem {
  id: string;
  width?: number;
  hidden?: boolean;
  pinned?: 'start' | 'end' | null;
  /**
   * 1-based column number. `1` is the first column and `5` is the fifth.
   * `0` and negative numbers are ignored, so that column stays where the column list defined it.
   */
  order: number;
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
  rowMenu: string;
  viewRow: string;
  editRow: string;
  deleteRow: string;
  rowDetails: string;
  editRecord: string;
  confirmDelete: string;
  confirmDeleteMessage: string;
  close: string;
  save: string;
  cancel: string;
  invalidValue: string;
  // Conditional formatting.
  format: string;
  formatTitle: string;
  formatAdd: string;
  formatEmpty: string;
  formatClose: string;
  formatEdit: string;
  formatDelete: string;
  formatSave: string;
  formatCancel: string;
  formatColumn: string;
  formatOperator: string;
  formatOperatorPlaceholder: string;
  formatValue: string;
  formatValueTo: string;
  formatScope: string;
  formatScopeCell: string;
  formatScopeRow: string;
  formatBackground: string;
  formatText: string;
  formatFontWeight: string;
  formatFontStyle: string;
  formatFont: string;
  formatRules: string;
  formatAddTitle: string;
  formatEditTitle: string;
  formatPreview: string;
  formatUseColor: string;
  formatOperators: Record<FormatOperator, string>;
  formatFontWeights: Record<FormatFontWeight, string>;
  formatFontStyles: Record<FormatFontStyle, string>;
  formatValidationColumn: string;
  formatValidationOperator: string;
  formatValidationValue: string;
  formatValidationRange: string;
  formatValidationNumber: string;
  formatValidationDate: string;
  headerStyle: string;
  headerStyleBackground: string;
  headerStyleText: string;
  headerStyleFontSize: string;
  headerStyleFontSizeUnit: string;
  headerStyleFontWeight: string;
  headerStyleTextTransform: string;
  headerStyleApply: string;
  headerStyleFontWeights: Record<HeaderFontWeight, string>;
  headerStyleTransforms: Record<HeaderTextTransform, string>;
  textAlignment: string;
  textAlignmentApply: string;
  textAlignments: Record<TextAlignValue, string>;
  // Export options.
  exportLabel: string;
  exportTitle: string;
  exportScope: string;
  exportScopeView: string;
  exportScopeAll: string;
  exportScopePage: string;
  exportScopeSelected: string;
  exportFormat: string;
  exportFormatCsv: string;
  exportFormatExcel: string;
  exportFormatPdf: string;
  exportAction: string;
  exportCancel: string;
  exportEmpty: string;
  exportNoneSelected: string;
  exportServerNote: string;
  exportDone: (count: number) => string;
}

export type FormatOperator =
  | 'equal'
  | 'notEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'notBetween'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte';

export type FormatScope = 'cell' | 'row';

export type FormatFontWeight = 'default' | 'normal' | '600' | '700';

export type FormatFontStyle = 'default' | 'bold' | 'italic';

/** Header font weight. Italic and bold are the only applied faces. */
export type HeaderFontWeight = 'default' | 'italic' | 'bold';

export type HeaderTextTransform = 'default' | 'uppercase' | 'lowercase' | 'capitalize';

/** Visual style for the table header. Does not change column header text. */
export interface HeaderStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: HeaderFontWeight;
  textTransform?: HeaderTextTransform;
}

/** One alignment for the whole table. Only one value is active. */
export type TextAlignValue = 'left' | 'center' | 'right';

/**
 * Global text alignment for header cells and every data cell.
 * An empty object keeps each column's own alignment.
 */
export interface TextAlignment {
  alignment?: TextAlignValue;
}

export interface ConditionalFormatStyle {
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: FormatFontWeight;
  fontStyle?: FormatFontStyle;
}

/** One conditional formatting rule. Later rules override earlier ones on the same property. Cell scope overrides row scope. */
export interface ConditionalFormatRule {
  id: string;
  columnId: string;
  operator: FormatOperator;
  value?: string;
  value2?: string;
  scope: FormatScope;
  style: ConditionalFormatStyle;
}

/** Which rows an export includes. */
export type ExportScope = 'view' | 'all' | 'page' | 'selected';

/** File format produced by the export dialog. */
export type ExportFormat = 'csv' | 'excel' | 'pdf';

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

/**
 * A saved row from the context-menu edit dialog.
 * The grid does not write this into `data`. The host updates its list or calls an API.
 */
export interface RowEdit<TRow = Record<string, unknown>> {
  /** Row that was right-clicked, before the edit. */
  row: TRow;
  rowId: RowId;
  /** Row after the edited fields are applied. */
  nextRow: TRow;
}

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

  // ---- Conditional formatting -------------------------------------------
  /** Shows the Format button. Set false to hide it. Provided rules still apply. */
  conditionalFormatting?: boolean;
  formatRules?: ConditionalFormatRule[];
  defaultFormatRules?: ConditionalFormatRule[];
  onFormatRulesChange?: (rules: ConditionalFormatRule[]) => void;
  headerStyle?: HeaderStyle;
  defaultHeaderStyle?: HeaderStyle;
  onHeaderStyleChange?: (style: HeaderStyle) => void;
  textAlignment?: TextAlignment;
  defaultTextAlignment?: TextAlignment;
  onTextAlignmentChange?: (alignment: TextAlignment) => void;
  // ---- Export -----------------------------------------------------------
  /** Shows the Export button. Set false to hide it. */
  exportable?: boolean;
  /** Download name. The format extension is added when it is missing. */
  exportFileName?: string;

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
  /**
   * Right-click a row to view, edit, or delete that record.
   * Off unless set, so the browser menu stays available on other grids.
   */
  enableRowContextMenu?: boolean;
  /**
   * Called when the edit dialog is saved with valid values.
   * The host updates `data` or sends `nextRow` to an API. Cancel does not call this.
   */
  onRowEdit?: (edit: RowEdit<TRow>) => void;
  /**
   * Called when delete is confirmed.
   * The host removes the row or calls an API. Choosing No does not call this.
   */
  onRowDelete?: (row: TRow, rowId: RowId) => void;

  // ---- Columns / persistence --------------------------------------------
  columnState?: ColumnStateItem[];
  defaultColumnState?: ColumnStateItem[];
  onColumnStateChange?: (state: ColumnStateItem[]) => void;
  enableColumnResize?: boolean;
  enableColumnReorder?: boolean;
  enableColumnHide?: boolean;
  enableColumnPin?: boolean;
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
