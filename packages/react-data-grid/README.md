# @atharvaits/react-data-grid

[![npm](https://img.shields.io/npm/v/@atharvaits/react-data-grid)](https://www.npmjs.com/package/@atharvaits/react-data-grid)
[![CI](https://github.com/AtharvaITS/npm-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/AtharvaITS/npm-packages/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@atharvaits/react-data-grid)](./LICENSE)

> **ReactDataGrid**: show any array of records as a **table**, a **card grid**, or a **list** — with sorting, search, filters, conditional formatting, paging or virtual scrolling (100,000+ rows), selection, column management, saved preferences, theming, localization, full keyboard and screen-reader support, and safe server rendering.

- **Zero required configuration** — pass `data`, get a readable table.
- **No runtime dependencies** besides React (≥ 18). About 38 KB gzipped, JS + CSS.
- **Typed**: full TypeScript definitions ship with the package.

## Contents

1. [Quick start](#quick-start)
2. [Views](#views)
3. [Data, ids and columns](#data-ids-and-columns)
4. [Sort, search and filter](#sort-search-and-filter)
5. [Conditional formatting](#conditional-formatting)
6. [Pagination and scrolling](#pagination-and-scrolling)
7. [Server (host-managed) mode](#server-host-managed-mode)
8. [Selection and activation](#selection-and-activation)
9. [Column management and saved preferences](#column-management-and-saved-preferences)
10. [Theming](#theming)
11. [Localization and right-to-left](#localization-and-right-to-left)
12. [Empty, no-results, loading and error content](#empty-no-results-loading-and-error-content)
13. [Accessibility](#accessibility)
14. [Server-side rendering](#server-side-rendering)
15. [Browser support](#browser-support)
16. [Props reference](#props-reference)

---

## Quick start

```bash
npm install @atharvaits/react-data-grid
```

Requires `react` and `react-dom` **18 or later** (peer dependencies).

```tsx
import { ReactDataGrid } from '@atharvaits/react-data-grid';
import '@atharvaits/react-data-grid/styles.css'; // once, anywhere in your app

const people = [
  { firstName: 'Ada', lastName: 'Lovelace', born: new Date(1815, 11, 10), active: true },
  { firstName: 'Alan', lastName: 'Turing', born: new Date(1912, 5, 23), active: false },
];

export function People() {
  return <ReactDataGrid data={people} />;
}
```

That renders a table with the headers **First Name**, **Last Name**, **Born** and **Active**, locale-formatted dates, ✓/✗ for booleans, search, filters, conditional formatting, a column chooser, pagination and a table/grid/list switcher.

What the zero-config defaults handle for you:

| Input | Result |
|---|---|
| `null`, `undefined`, `[]` | “No data to display” |
| Not an array / items that aren't objects | Ignored, with one `[ReactDataGrid]` warning in development |
| Rows with different keys | Columns are the union of all keys; missing values are blank |
| Numbers, dates, booleans | Locale-formatted; `NaN`/`Infinity`/invalid dates show `—` |
| Nested objects / arrays | Short summaries such as `{city, zip, +1}` and `a, b, c +2` |
| `<script>` or other markup in values | Shown as literal text, never interpreted |
| Very long text | Truncated with `…`; the full value shows on hover and keyboard focus |

The component **never modifies** the array you pass.

---

## Views

```tsx
<ReactDataGrid
  data={products}
  defaultView="grid" // 'table' | 'grid' | 'list' (default 'table')
  views={['grid', 'list']} // which views the switcher offers
  showViewSwitcher // default true; hidden automatically with one view
  titleField="name" // card title / list primary line (default: first visible text column)
  subtitleField="category" // list secondary line (default: second visible text column)
  imageField="photo" // card / list image (default: first image column)
  cardMinWidth={260} // grid columns = floor(width / cardMinWidth), at least 1 (default 240)
  cardFieldLimit={4} // fields shown per card / list item (default 6)
/>
```

Controlled view:

```tsx
const [view, setView] = useState<ViewType>('table');
<ReactDataGrid data={rows} view={view} onViewChange={setView} />;
```

Custom layouts keep the component's focus handling, roles and selection:

```tsx
<ReactDataGrid
  data={employees}
  renderCard={({ row, selected, toggleSelected, fields }) => (
    <div className="my-card">
      <img src={row.avatar} alt="" />
      <strong>{row.name}</strong>
      {fields.map((f) => (
        <div key={String(f.column.id ?? f.column.field)}>{f.content}</div>
      ))}
    </div>
  )}
  renderListItem={({ row }) => (
    <div>
      <strong>{row.name}</strong> · {row.role}
    </div>
  )}
/>
```

Switching views keeps sort, search, filters, selection and page.

---

## Data, ids and columns

### Row ids

```tsx
<ReactDataGrid data={rows} getRowId="id" />
<ReactDataGrid data={rows} getRowId="meta.uuid" />            // nested path
<ReactDataGrid data={rows} getRowId={(row, index) => row.sku} />
```

Ids keep the selection stable when data changes. Without `getRowId`, or when ids are missing or duplicated (development warning), rows are identified by position.

### Column definitions

```tsx
import { ReactDataGrid, createColumns } from '@atharvaits/react-data-grid';

type Employee = { id: string; name: string; salary: number; active: boolean; start: string; address: { city: string } };

const columns = createColumns<Employee>([
  { field: 'name', header: 'Name', width: 200, pinned: 'start' },
  { field: 'salary', type: 'currency', formatOptions: { currency: 'EUR', maximumFractionDigits: 0 } },
  { field: 'start', header: 'Start date', type: 'date' }, // "2024-02-01" strings sort/filter as dates
  { field: 'address.city', header: 'City' }, // nested path
  { id: 'label', header: 'Label', valueGetter: (row) => `${row.name} (${row.address.city})` }, // derived
  {
    field: 'active',
    header: 'Status',
    render: ({ value }) => <span className={value ? 'badge ok' : 'badge off'}>{value ? 'Active' : 'Inactive'}</span>,
  },
  { field: 'id', hidden: true, sortable: false, filterable: false, searchable: false },
]);

<ReactDataGrid data={employees} columns={columns} getRowId="id" />;
```

| `ColumnDef` field | Purpose | Default |
|---|---|---|
| `field` | Dot path to the value (`address.city`); a key containing dots is read literally first | — |
| `id` | Unique id; required with `valueGetter` when there is no `field` | `field` |
| `header` | Header / label text | humanized field (`firstName` → “First Name”) |
| `type` | `auto`, `text`, `number`, `currency`, `percent`, `boolean`, `date`, `image`, `enum` | `auto` (inferred; strings are never inferred as numbers/dates) |
| `valueGetter(row)` | Derived value used for display, sort, filter and search | — |
| `valueSetter(row, value)` | Row to commit after a double-click edit. Required to edit a `valueGetter` column; the grid reports it as `onCellEdit` `nextRow` | — |
| `format(value, row)` | Display text only — sort/filter/search still use the raw value | locale-aware per type |
| `formatOptions` | `Intl` options, e.g. `{ currency: 'EUR' }`, `{ dateStyle: 'long' }` | — |
| `render(ctx)` | Custom content in every view. `ctx`: `row, rowId, value, formattedValue, column, view, selected` | — |
| `compare(a, b, rowA, rowB)` | Custom sort order | type-aware |
| `enumValues` | Values for the “is any of” filter | auto-collected when ≤ 20 values repeat |
| `width`, `minWidth`, `maxWidth` | Pixels (clamped) | auto, `60`, `800` |
| `align` | `start`, `center`, `end` | `end` for numeric types |
| `hidden`, `pinned` | Initial visibility; `'start'`, `'end'` or `null` | `false`, `null` |
| `sortable`, `filterable`, `searchable`, `resizable`, `reorderable`, `hideable` | Per-column switches | `true` (images aren't searchable) |

---

## Sort, search and filter

```tsx
<ReactDataGrid
  data={rows}
  defaultSort={[{ columnId: 'salary', direction: 'desc' }]}
  multiSort // Shift+click adds secondary sorts
  defaultSearch=""
  searchDebounceMs={200}
  searchable // show the search box (default true)
  filterable // show the filter button (default true)
  defaultFilters={[{ columnId: 'start', operator: 'between', value: '2024-01-01', value2: '2024-12-31' }]}
  onSortChange={(sort) => console.log(sort)}
  onSearchChange={(q) => console.log(q)}
  onFiltersChange={(filters) => console.log(filters)}
/>
```

- **Sorting** cycles ascending → descending → original order. It is stable, language-aware (`item2` before `item10`, `é` next to `e`), and puts empty values last in both directions. Mixed columns order numbers, then text, then empty values.
- **Search** is case- and accent-insensitive (`jose` finds `José`) across visible, searchable columns, using raw values.
- **Filters** combine with AND:

| Column type | Operators |
|---|---|
| text / enum | `contains`, `equals`, `startsWith`, `endsWith`, `in`, `isEmpty`, `isNotEmpty` |
| number / currency / percent | `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `between`, `isEmpty`, `isNotEmpty` |
| date | `before`, `after`, `on`, `between` (inclusive), `isEmpty`, `isNotEmpty` |
| boolean | `isTrue`, `isFalse`, `isEmpty` |

Controlled: `sort` + `onSortChange`, `search` + `onSearchChange`, `filters` + `onFiltersChange`.

---

## Conditional formatting

The toolbar **Format** button opens a panel to add, edit, and delete rules. A matching rule paints a cell or the whole row with a background, text color, font weight, and font style. The same rules apply in the table, grid, and list views.

```tsx
<ReactDataGrid
  data={rows}
  conditionalFormatting // show the Format button (default true)
  defaultFormatRules={[
    {
      id: 'high',
      columnId: 'amount',
      operator: 'gte',
      value: '10000',
      scope: 'row',
      style: { backgroundColor: '#dcfce7', fontWeight: '700' },
    },
  ]}
  onFormatRulesChange={(rules) => save(rules)}
/>
```

Hide the button and still apply rules you pass in:

```tsx
<ReactDataGrid data={rows} conditionalFormatting={false} formatRules={rules} />
```

- Operators: `equal`, `notEqual`, `contains`, `notContains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`, `lt`, `lte`, `gt`, `gte`, `between`, `notBetween`.
- `isEmpty` and `isNotEmpty` take no value. `between` and `notBetween` use `value` and `value2`.
- Scope `cell` paints that column. Scope `row` paints the whole row.
- Later rules override earlier ones on the same property. A cell rule overrides a row rule on that property.
- Controlled: `formatRules` + `onFormatRulesChange`.

`persistStateKey` does not save formatting rules.

---

## Pagination and scrolling

```tsx
// Pages (default)
<ReactDataGrid data={rows} defaultPageSize={50} pageSizeOptions={[25, 50, 100]} onPageChange={setPage} />

// Controlled page
<ReactDataGrid data={rows} page={page} onPageChange={setPage} pageSize={size} onPageSizeChange={setSize} />

// Continuous scrolling with virtualization (100,000+ rows)
<ReactDataGrid data={bigArray} pagination="scroll" height={600} />
```

- Changing search or filters goes back to page 1. If data shrinks, the page moves to the last valid page.
- Changing the page size keeps the first visible record on screen.
- In scroll mode only the visible rows, cards or list items are rendered, so scrolling stays smooth at 100k rows.

---

## Server (host-managed) mode

For data that's too large to send to the browser, the grid asks your app for one page at a time.

**Recommended form: `fetchData` returns a promise.** The grid aborts the previous request's `signal` when a new request starts and applies only the latest result.

```tsx
<ReactDataGrid<Order>
  dataMode="server"
  getRowId="id"
  columns={orderColumns}
  fetchData={async (req, { signal }) => {
    // req: { requestId, page, pageSize, sort, filters, search }
    const res = await fetch('/api/orders?' + new URLSearchParams({ q: JSON.stringify(req) }), { signal });
    if (!res.ok) throw new Error('Failed to load');
    const body = await res.json();
    return { rows: body.items, totalCount: body.total };
  }}
/>
```

**Host-driven form.** Your data layer (React Query, Redux, …) does the loading:

```tsx
<ReactDataGrid
  dataMode="server"
  onDataRequest={(req) => setQuery(req)}
  data={query.data?.items}
  totalCount={query.data?.total}
  loading={query.isFetching}
  error={query.error}
  onRetry={() => query.refetch()}
/>
```

While loading, a spinner shows over the current rows. On error, a banner with **Retry** appears above the rows that are still visible. In server mode, “select all” covers the loaded page. `pagination="scroll"` isn't supported in server mode.

---

## Selection and activation

```tsx
<ReactDataGrid
  data={rows}
  getRowId="id"
  selectionMode="multi" // 'none' | 'single' | 'multi'
  defaultSelection={['r1']}
  isRowSelectable={(row) => !row.archived}
  onSelectionChange={(ids, rows) => setSelected(ids)}
  onRowActivate={(row, id, event) => openDetails(id)} // click or Enter, in every view
/>
```

- **Multi mode**: checkboxes, Shift+click for ranges, Ctrl/⌘+click to toggle, and a header checkbox that selects every matching row across pages. Also Space on the focused row and Ctrl/⌘+A.
- Rows that disappear from new data are removed from the selection, and `onSelectionChange` is called.
- Controlled: `selection` + `onSelectionChange`.

---

## Column management and saved preferences

In the table view, users can resize columns (drag the header edge, or Alt+←/→), reorder them (drag a header, or **Move left/right** in the column menu), hide or show them (column menu or **Columns** button), and pin them to the start or end. Hidden columns and column order also apply to the grid and list views.

```tsx
<ReactDataGrid
  data={rows}
  enableColumnResize
  enableColumnReorder
  enableColumnHide
  enableColumnPin // all default true
  defaultColumnState={[{ id: 'notes', order: 5, hidden: true }]}
  onColumnStateChange={(state) => save(state)}
  persistStateKey="orders-grid" // remember view, sort, page size and column layout in localStorage
  onStateChange={(state, changed) => console.log(changed, state)}
/>
```

Saved preferences live under `localStorage["@atharvaits/react-data-grid:<key>"]`. They are validated when loaded: unknown columns and disallowed views are ignored. Selection, search, filters, page and conditional formatting rules are never saved. If storage is unavailable, preferences are kept in memory only. Controlled props always take precedence over saved values.

---

## Theming

```tsx
<ReactDataGrid
  data={rows}
  theme={{
    colorScheme: 'auto', // 'light' | 'dark' | 'auto' (follows the OS)
    density: 'compact', // 'compact' | 'standard' | 'comfortable'
    tokens: { colorAccent: '#7a2ec9', radius: '4px', fontFamily: 'Inter, sans-serif' },
  }}
  className="my-grid"
  style={{ maxWidth: 1200 }}
/>
```

Every token is a CSS custom property on `.aits-root`, so you can also set tokens in plain CSS:

```css
.my-grid {
  --aits-color-accent: #7a2ec9;
  --aits-row-height: 36px;
}
```

Tokens: `colorBg`, `colorSurface`, `colorSurfaceAlt`, `colorBorder`, `colorText`, `colorTextMuted`, `colorAccent`, `colorAccentText`, `colorSelectedBg`, `colorFocusRing`, `colorDanger`, `fontFamily`, `fontSize`, `radius`, `spacing`, `rowHeight`, `headerHeight`, `cardGap`, `shadow`. Each maps to `--aits-<kebab-case>`.

All package styles sit in the `@layer aits` cascade layer, so your own CSS wins without any specificity tricks. Stable class hooks: `.aits-root`, `.aits-toolbar`, `.aits-table`, `.aits-header-cell`, `.aits-row`, `.aits-cell`, `.aits-grid`, `.aits-card`, `.aits-list`, `.aits-list-item`, `.aits-pagination`, `.aits-empty`, `.aits-error`. State attributes: `[data-selected]`, `[data-pinned]`, `[data-density]`, `[data-color-scheme]`, `[data-view]`.

---

## Localization and right-to-left

```tsx
import { ReactDataGrid, defaultMessages, type Messages } from '@atharvaits/react-data-grid';

const fr: Partial<Messages> = {
  searchPlaceholder: 'Rechercher…',
  empty: 'Aucune donnée à afficher',
  rowsPerPage: 'Lignes par page',
  pageRange: (from, to, total) => `${from}–${to} sur ${total}`,
  resultsCount: (n) => `${n} résultat${n > 1 ? 's' : ''}`,
  // …every built-in string can be replaced; see `defaultMessages`
};

<ReactDataGrid data={rows} messages={fr} locale="fr-FR" direction="auto" />;
```

- `locale` controls number and date formatting and text sort order. It defaults to the browser language, and to `en-US` during server rendering.
- `direction`: `'ltr'`, `'rtl'`, or `'auto'` (inherited). Layout, pinning, resizing and arrow keys mirror in right-to-left mode.

---

## Empty, no-results, loading and error content

```tsx
<ReactDataGrid
  data={rows}
  emptyContent={<p>No orders yet.</p>}
  noResultsContent={({ clearFilters }) => <button onClick={clearFilters}>Clear filters</button>}
  loadingContent={<Spinner />}
  errorContent={({ error, retry }) => <button onClick={retry}>Retry ({String(error)})</button>}
/>
```

---

## Accessibility

The component targets **WCAG 2.2 AA**. It follows the WAI-ARIA grid, listbox and radio-group patterns: one tab stop per widget, visible focus, polite announcements of result counts, and correct row and column positions even while virtualized. Name the grid with `aria-label` or `aria-labelledby`.

| Where | Keys |
|---|---|
| Table / grid view | ←/→/↑/↓ move · Home/End (row start/end) · Ctrl+Home/End (first/last) · PageUp/PageDown |
| List view | ↑/↓ · Home/End · PageUp/PageDown |
| Any record | Enter = activate (`onRowActivate`) · Space = select · Shift+Space = select range · Ctrl/⌘+A = select all |
| Table header | Enter/Space = sort (Shift = add to multi-sort) · Alt+↓ or Shift+F10 = column menu · Alt+←/→ = resize |
| View switcher | ←/→ (↑/↓) · Home/End |
| Menus / dialogs | ↑/↓ in menus · Esc closes and returns focus |

---

## Server-side rendering

`ReactDataGrid` renders on the server (`renderToString`, Next.js, Remix, …) without touching `window` or `document`. It shows the first page (or first 50 rows in scroll mode), hydrates without mismatches, and then applies the browser locale and any saved preferences.

```tsx
// Next.js App Router
'use client';
import { ReactDataGrid } from '@atharvaits/react-data-grid';
import '@atharvaits/react-data-grid/styles.css';
```

---

## Browser support

The latest two versions of Chrome, Edge, Firefox and Safari, on desktop and mobile. Internet Explorer is not supported.

---

## Props reference

All props are optional. For controllable state, `x` makes it controlled, `defaultX` sets the initial value when uncontrolled, and `onXChange` reports every change.

### Data

| Prop | Type | Default |
|---|---|---|
| `data` | `readonly TRow[] \| null \| undefined` | `[]` |
| `getRowId` | `string \| (row, index) => string \| number` | row position |
| `columns` | `ColumnDef<TRow>[]` | derived from data |
| `dataMode` | `'client' \| 'server'` | `'client'` |
| `fetchData` | `(req: DataRequest, { signal }) => Promise<{ rows, totalCount }>` | — |
| `onDataRequest` | `(req: DataRequest) => void` | — |
| `totalCount` | `number` | `data.length` |
| `loading` | `boolean` | `false` |
| `error` | `unknown` | — |
| `onRetry` | `() => void` | re-issues the last request |

### Views

| Prop | Type | Default |
|---|---|---|
| `view` / `defaultView` / `onViewChange` | `'table' \| 'grid' \| 'list'` | `'table'` |
| `views` | `ViewType[]` | all three |
| `showViewSwitcher` | `boolean` | `true` |
| `titleField` / `subtitleField` / `imageField` | column id | automatic |
| `cardMinWidth` | `number` | `240` |
| `cardFieldLimit` | `number` | `6` |
| `renderCard` / `renderListItem` | `(ctx: CardContext) => ReactNode` | — |

### Sort, search, filter

| Prop | Type | Default |
|---|---|---|
| `sort` / `defaultSort` / `onSortChange` | `SortItem[]` | `[]` |
| `multiSort` | `boolean` | `false` |
| `search` / `defaultSearch` / `onSearchChange` | `string` | `''` |
| `searchable` | `boolean` | `true` |
| `searchDebounceMs` | `number` | `200` |
| `filters` / `defaultFilters` / `onFiltersChange` | `FilterCondition[]` | `[]` |
| `filterable` | `boolean` | `true` |

### Conditional formatting

| Prop | Type | Default |
|---|---|---|
| `conditionalFormatting` | `boolean` | `true` |
| `formatRules` / `defaultFormatRules` / `onFormatRulesChange` | `ConditionalFormatRule[]` | `[]` |

### Pagination and scrolling

| Prop | Type | Default |
|---|---|---|
| `pagination` | `'pages' \| 'scroll'` | `'pages'` |
| `page` / `defaultPage` / `onPageChange` | `number` (0-based) | `0` |
| `pageSize` / `defaultPageSize` / `onPageSizeChange` | `number` | `25` |
| `pageSizeOptions` | `number[]` | `[10, 25, 50, 100]` |
| `height` | `number \| string` | `'auto'`; `600` in scroll mode |

### Selection and interaction

| Prop | Type | Default |
|---|---|---|
| `selectionMode` | `'none' \| 'single' \| 'multi'` | `'none'` |
| `selection` / `defaultSelection` / `onSelectionChange` | `RowId[]`; callback `(ids, rows)` | `[]` |
| `isRowSelectable` | `(row) => boolean` | all rows |
| `onRowActivate` | `(row, id, event) => void` | — |
| `onCellEdit` | `(edit: { row, rowId, columnId, field, previousValue, value, nextRow? }) => void` | — |

### Columns and persistence

| Prop | Type | Default |
|---|---|---|
| `columnState` / `defaultColumnState` / `onColumnStateChange` | `ColumnStateItem[]` | from `columns` |
| `enableColumnResize` / `enableColumnReorder` / `enableColumnHide` / `enableColumnPin` | `boolean` | `true` |
| `persistStateKey` | `string` | off |
| `onStateChange` | `(state: GridState, changed: keyof GridState) => void` | — |

### Appearance and localization

| Prop | Type | Default |
|---|---|---|
| `theme` | `{ colorScheme?, density?, tokens? }` | `{ colorScheme: 'auto', density: 'standard' }` |
| `locale` | `string` | browser language (`'en-US'` on the server) |
| `direction` | `'ltr' \| 'rtl' \| 'auto'` | `'auto'` |
| `messages` | `Partial<Messages>` | `defaultMessages` |
| `emptyContent` / `noResultsContent` / `loadingContent` / `errorContent` | `ReactNode \| (ctx) => ReactNode` | built-in |
| `className` / `style` / `id` / `aria-label` / `aria-labelledby` | standard | — |

### Exports

`ReactDataGrid`, `createColumns`, `defaultMessages`, and the types `ReactDataGridProps`, `ColumnDef`, `ColumnType`, `CellContext`, `CardContext`, `CardField`, `ListItemContext`, `ViewType`, `SortItem`, `SortDirection`, `FilterCondition`, `FilterOperator`, `ConditionalFormatRule`, `ConditionalFormatStyle`, `FormatOperator`, `FormatScope`, `FormatFontWeight`, `FormatFontStyle`, `SelectionMode`, `RowId`, `GridState`, `ColumnStateItem`, `DataRequest`, `DataPage`, `FetchDataOptions`, `Theme`, `ThemeToken`, `Density`, `ColorScheme`, `Messages`, `StateContent`, `StateContentContext`.

## License

MIT
