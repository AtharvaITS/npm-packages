# Contract: `@atharvaits/react-data-grid` Public API (v1)

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

This is the complete public surface of the package. Anything not listed here is internal and may change without a major version bump. Signatures use TypeScript notation.

---

## 1. Package entry points (`package.json` → `exports`)

| Import path | Contents |
|---|---|
| `@atharvaits/react-data-grid` | Component, types, helpers (ESM `dist/index.js`, CJS `dist/index.cjs`, types `dist/index.d.ts`) |
| `@atharvaits/react-data-grid/styles.css` | The required stylesheet (import once in the host app) |
| `@atharvaits/react-data-grid/package.json` | Metadata |

Peer dependencies: `react >=18.0.0`, `react-dom >=18.0.0`. Runtime `dependencies`: **none**.

## 2. Exports

```ts
export function ReactDataGrid<TRow = Record<string, unknown>>(
  props: ReactDataGridProps<TRow>
): JSX.Element;

export function createColumns<TRow>(defs: ColumnDef<TRow>[]): ColumnDef<TRow>[]; // identity helper for type inference

export const defaultMessages: Messages;

export type {
  ReactDataGridProps, ColumnDef, ColumnType, CellContext, CardContext, ListItemContext,
  ViewType, SortItem, SortDirection, FilterCondition, FilterOperator,
  SelectionMode, RowId, GridState, ColumnStateItem,
  DataRequest, DataPage, FetchDataOptions,
  Theme, ThemeToken, Density, ColorScheme, Messages,
};
```

## 3. Props — `ReactDataGridProps<TRow>`

Pattern for controllable state: `x` makes it controlled, `defaultX` sets the initial value when uncontrolled, and `onXChange` is called on every change requested by the end user.

### 3.1 Data

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `readonly TRow[] \| null \| undefined` | `[]` | The **only required input** in practice. Invalid values are treated as `[]` (dev warning). |
| `getRowId` | `keyof TRow & string \| string \| ((row: TRow, index: number) => string \| number)` | index | |
| `columns` | `ColumnDef<TRow>[]` | auto-derived | See §4. |
| `dataMode` | `'client' \| 'server'` | `'client'` | |
| `fetchData` | `(req: DataRequest, opts: FetchDataOptions) => Promise<DataPage<TRow>>` | — | Server mode, promise form (recommended). |
| `onDataRequest` | `(req: DataRequest) => void` | — | Server mode, host-driven form. The host then passes `data`, `totalCount`, `loading`, `error`. |
| `totalCount` | `number` | `data.length` | Server mode, host-driven form. |
| `loading` | `boolean` | `false` | |
| `error` | `unknown` | — | A truthy value shows the error state. |
| `onRetry` | `() => void` | re-issue last request | |

### 3.2 Views

| Prop | Type | Default |
|---|---|---|
| `view` / `defaultView` / `onViewChange` | `ViewType` / `ViewType` / `(v: ViewType) => void` | `'table'` |
| `views` | `ViewType[]` | `['table','grid','list']` |
| `showViewSwitcher` | `boolean` | `true` (auto-hidden when `views.length === 1`) |
| `titleField` / `subtitleField` / `imageField` | `string` (column id) | see data model §5 |
| `cardMinWidth` | `number` | `240` |
| `cardFieldLimit` | `number` | `6` |
| `renderCard` | `(ctx: CardContext<TRow>) => ReactNode` | — |
| `renderListItem` | `(ctx: ListItemContext<TRow>) => ReactNode` | — |

### 3.3 Sort, search, filter

| Prop | Type | Default |
|---|---|---|
| `sort` / `defaultSort` / `onSortChange` | `SortItem[]` | `[]` |
| `multiSort` | `boolean` | `false` |
| `search` / `defaultSearch` / `onSearchChange` | `string` | `''` |
| `searchable` | `boolean` | `true` |
| `searchDebounceMs` | `number` | `200` |
| `filters` / `defaultFilters` / `onFiltersChange` | `FilterCondition[]` | `[]` |
| `filterable` | `boolean` | `true` |

### 3.4 Pagination and scrolling

| Prop | Type | Default |
|---|---|---|
| `pagination` | `'pages' \| 'scroll'` | `'pages'` |
| `page` / `defaultPage` / `onPageChange` | `number` (0-based) | `0` |
| `pageSize` / `defaultPageSize` / `onPageSizeChange` | `number` | `25` |
| `pageSizeOptions` | `number[]` | `[10,25,50,100]` |
| `height` | `number \| string` | `'auto'` for pages, `600` for scroll (a scroll container needs a height) |

### 3.5 Selection and interaction

| Prop | Type | Default |
|---|---|---|
| `selectionMode` | `'none' \| 'single' \| 'multi'` | `'none'` |
| `selection` / `defaultSelection` / `onSelectionChange` | `RowId[]`; callback `(ids: RowId[], rows: TRow[]) => void` | `[]` |
| `isRowSelectable` | `(row: TRow) => boolean` | all `true` |
| `onRowActivate` | `(row: TRow, id: RowId, event: MouseEvent \| KeyboardEvent) => void` | — |

### 3.6 Columns (interactive) and persistence

| Prop | Type | Default |
|---|---|---|
| `columnState` / `defaultColumnState` / `onColumnStateChange` | `ColumnStateItem[]` | from `columns` |
| `enableColumnResize` / `enableColumnReorder` / `enableColumnHide` / `enableColumnPin` | `boolean` | `true` |
| `persistStateKey` | `string` | — (persistence off) |
| `onStateChange` | `(state: GridState, changed: keyof GridState) => void` | — |

### 3.7 Appearance and localization

| Prop | Type | Default |
|---|---|---|
| `theme` | `Theme` — `{ colorScheme?, density?, tokens? }` | `{ colorScheme: 'auto', density: 'standard' }` |
| `locale` | `string` | browser locale; `'en-US'` when rendering on the server |
| `direction` | `'ltr' \| 'rtl' \| 'auto'` | `'auto'` |
| `messages` | `Partial<Messages>` | `defaultMessages` |
| `emptyContent` / `noResultsContent` / `loadingContent` / `errorContent` | `ReactNode \| ((ctx) => ReactNode)` | built-in |
| `className` / `style` / `id` / `aria-label` / `aria-labelledby` | standard | — |

## 4. `ColumnDef<TRow>`

```ts
interface ColumnDef<TRow> {
  field?: string;                     // dot path, e.g. "address.city"
  id?: string;                        // defaults to field; required with valueGetter
  header?: string;
  type?: ColumnType;                  // 'auto' | 'text' | 'number' | 'currency' | 'percent' | 'boolean' | 'date' | 'image' | 'enum'
  valueGetter?: (row: TRow) => unknown;
  format?: (value: unknown, row: TRow) => string;
  formatOptions?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions & { currency?: string };
  render?: (ctx: CellContext<TRow>) => ReactNode;
  compare?: (a: unknown, b: unknown, rowA: TRow, rowB: TRow) => number;
  enumValues?: readonly unknown[];
  width?: number; minWidth?: number; maxWidth?: number;
  align?: 'start' | 'center' | 'end';
  hidden?: boolean;
  pinned?: 'start' | 'end' | null;
  sortable?: boolean; filterable?: boolean; searchable?: boolean;
  resizable?: boolean; reorderable?: boolean; hideable?: boolean;
}

interface CellContext<TRow> {
  row: TRow; rowId: RowId; value: unknown; formattedValue: string;
  column: ColumnDef<TRow>; view: ViewType; selected: boolean;
}
interface CardContext<TRow> {
  row: TRow; rowId: RowId; selected: boolean; toggleSelected(): void;
  fields: Array<{ column: ColumnDef<TRow>; value: unknown; formattedValue: string; content: ReactNode }>;
}
type ListItemContext<TRow> = CardContext<TRow>;
```

## 5. Server mode

```ts
interface DataRequest {
  requestId: number;
  page: number; pageSize: number;
  sort: SortItem[]; filters: FilterCondition[]; search: string;
}
interface FetchDataOptions { signal: AbortSignal }
interface DataPage<TRow> { rows: TRow[]; totalCount: number }
```

Guarantees:

1. `fetchData` is called once on mount, and again after any change to page, page size, sort, filters, or (debounced) search.
2. Starting a new request **aborts** the previous `signal`.
3. A resolved `DataPage` is applied only if it belongs to the latest request.
4. A rejection that is not an `AbortError` shows `errorContent` with a Retry button. Rows shown before the error stay visible under an error banner.
5. Unmounting aborts any in-flight request, and results after unmount are ignored with no warnings.

## 6. `Messages` (all built-in text, FR-035)

```ts
interface Messages {
  searchPlaceholder: string;          // "Search…"
  searchLabel: string;                // "Search records"
  clearSearch: string;                // "Clear search"
  clearAll: string;                   // "Clear all"
  viewTable: string; viewGrid: string; viewList: string; viewSwitcherLabel: string;
  empty: string;                      // "No data to display"
  noResults: string;                  // "No matching results"
  loading: string;                    // "Loading…"
  error: string;                      // "Something went wrong while loading data."
  retry: string;                      // "Retry"
  rowsPerPage: string;                // "Rows per page"
  pageRange: (from: number, to: number, total: number) => string; // "51–75 of 500"
  resultsCount: (count: number) => string;   // "{count} results" (live region)
  selectedCount: (count: number) => string;  // "{count} selected"
  selectAll: string; selectRow: string; deselectRow: string;
  sortAscending: string; sortDescending: string; sortNone: string;
  filter: string; addFilter: string; removeFilter: string;
  operators: Record<FilterOperator, string>;
  columns: string; hideColumn: string; showColumn: string;
  pinStart: string; pinEnd: string; unpin: string;
  firstPage: string; previousPage: string; nextPage: string; lastPage: string;
  yes: string; no: string;
  // Added in 1.0.0 (with defaults):
  moveLeft: string; moveRight: string;            // "Move left" / "Move right"
  columnMenu: (header: string) => string;         // "{header} column options"
  sortBy: string;                                 // "Sort by"
  filterColumn: string; filterOperator: string;   // "Column" / "Condition"
  filterValue: string; filterValueTo: string;     // "Value" / "and"
  selectAllMatching: (count: number) => string;   // "Select all {count}"
  allOnPageSelected: (count: number) => string;   // "All {count} on this page selected"
  clearSelection: string;                         // "Clear selection"
  pageStatus: (page: number, pageCount: number) => string; // "Page {page} of {pageCount}"
  resizeColumn: string;                           // "Resize column"
}
```

## 7. Theme tokens (CSS custom properties)

`ThemeToken` keys map to `--aits-<kebab-key>` properties on the root element. Hosts may also set these properties in their own CSS.

`colorBg`, `colorSurface`, `colorSurfaceAlt`, `colorBorder`, `colorText`, `colorTextMuted`, `colorAccent`, `colorAccentText`, `colorSelectedBg`, `colorFocusRing`, `colorDanger`, `fontFamily`, `fontSize`, `radius`, `spacing`, `rowHeight`, `headerHeight`, `cardGap`, `shadow`.

Stable styling hooks (class names, part of the contract): `.aits-root`, `.aits-toolbar`, `.aits-table`, `.aits-header-cell`, `.aits-row`, `.aits-cell`, `.aits-grid`, `.aits-card`, `.aits-list`, `.aits-list-item`, `.aits-pagination`, `.aits-empty`, `.aits-error`. State attributes: `[data-selected]`, `[data-pinned="start|end"]`, `[data-density]`, `[data-color-scheme]`, `[data-view]`.

## 8. Development warnings (not shipped in production builds)

Every warning uses the prefix `[ReactDataGrid]` and is emitted at most once per message per instance. Triggers:
- `data` is not an array
- invalid row items
- duplicate or missing row ids
- duplicate column ids
- `view` not in `views`
- function or symbol cell values
- `pageSize` not in `pageSizeOptions`
- both `fetchData` and `onDataRequest` supplied
- `pagination="scroll"` without a height

## 9. Versioning

Semantic Versioning. Removing or renaming anything in this document, or changing a default, is a **major** change. Adding optional props or new message keys (with defaults) is **minor**.
