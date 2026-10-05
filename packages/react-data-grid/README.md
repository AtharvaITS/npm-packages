# @atharvaits/react-data-grid

[![npm](https://img.shields.io/npm/v/@atharvaits/react-data-grid)](https://www.npmjs.com/package/@atharvaits/react-data-grid)
[![CI](https://github.com/AtharvaITS/npm-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/AtharvaITS/npm-packages/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@atharvaits/react-data-grid)](./LICENSE)

> **ReactDataGrid**: show any array of records as a **table**, a **card grid**, or a **list** — with sorting, search, filters, paging or virtual scrolling (100,000+ rows), selection, inline editing, column management, saved preferences, theming, localization, full keyboard and screen-reader support, and safe server rendering.

- **Zero required configuration** — pass `data`, get a readable table.
- **No runtime dependencies** besides React (≥ 18). About 38 KB gzipped, JS + CSS.
- **Typed**: full TypeScript definitions ship with the package.

This file is the user guide. Each feature below says what it does, where it appears, a working example, and the steps to test it against the current implementation.

## Contents

1. [Quick start](#quick-start)
2. [Playground](#playground)
3. [Views](#views)
4. [Data, ids and columns](#data-ids-and-columns)
5. [Sort, search and filter](#sort-search-and-filter)
6. [Pagination and scrolling](#pagination-and-scrolling)
7. [Server (host-managed) mode](#server-host-managed-mode)
8. [Selection and activation](#selection-and-activation)
9. [Inline cell editing](#inline-cell-editing)
10. [Column management and saved preferences](#column-management-and-saved-preferences)
11. [Theming](#theming)
12. [Localization and right-to-left](#localization-and-right-to-left)
13. [Empty, no-results, loading and error content](#empty-no-results-loading-and-error-content)
14. [Accessibility](#accessibility)
15. [Server-side rendering](#server-side-rendering)
16. [Browser support](#browser-support)
17. [Props reference](#props-reference)

---

## Quick start

```bash
npm install @atharvaits/react-data-grid
```

Requires `react` and `react-dom` **18 or later** (peer dependencies). Import the stylesheet once:

```tsx
import { ReactDataGrid } from '@atharvaits/react-data-grid';
import '@atharvaits/react-data-grid/styles.css';

const people = [
  { firstName: 'Ada', lastName: 'Lovelace', born: new Date(1815, 11, 10), active: true },
  { firstName: 'Alan', lastName: 'Turing', born: new Date(1912, 5, 23), active: false },
];

export function People() {
  return <ReactDataGrid data={people} aria-label="People" />;
}
```

That renders a table with the headers **First Name**, **Last Name**, **Born** and **Active**, locale-formatted dates, a check or cross for booleans, search, filters, a column chooser, pagination and a table/grid/list switcher.

The toolbar (search, **Filter**, **Columns**, and the **Table / Grid / List** switcher) is shown when there is at least one row, and always in server mode. An empty client array shows “No data to display” and hides the toolbar.

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

The component **never modifies** the array you pass. Sorting, filtering, paging and editing all leave `data` as you gave it. To keep an edit, update `data` yourself from `onCellEdit` (see [Inline cell editing](#inline-cell-editing)).

**Test it**

1. Render the snippet above.
2. Confirm four headers and two rows. **Active** shows a check for Ada and a cross for Alan. The check and cross include the hidden text “Yes” and “No”.
3. Confirm the toolbar contains a search box labeled **Search records**, a **Filter** button, a **Columns** button, and a **View** switcher with **Table**, **Grid** and **List**.
4. Pass `data={[]}` and confirm the message “No data to display” and that the toolbar is gone.

---

## Playground

The repository includes a Vite playground that mounts the grid against the package source. From the repository root:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The page title is **ReactDataGrid Playground**. Use the **Scenario** dropdown to load a data set, and **Reset** to return to the default scenario and remount the grid (that clears sort, search, filters, page and column layout).

The playground turns on search, filters, all three views, column resize, reorder, hide and pin, and paging (25 rows, options 10 / 25 / 50 / 100). It does **not** turn on row selection, inline editing, multi-sort, saved preferences, or custom messages. Those features are implemented; test them with the code samples in the sections below.

| Scenario | Sample data | What to look for |
|---|---|---|
| **Default: 50 sample records** | 50 employees. Fields: `id`, `name`, `email`, `avatar`, `department`, `role`, `salary`, `bonusPct`, `active`, `startDate`, `rating`, `address`, `bio`. Row id is `id` (`EMP-001` …). | Full toolbar, two pages of 25, address shown as “City, Country” |
| **Empty array** | `[]` | “No data to display”. No toolbar |
| **data = null** | `null` | Same empty state as an empty array |
| **Invalid items (null, numbers, strings)** | Three object rows mixed with `null`, `42`, `'str'`, an array and `undefined` | Only “Valid row one”, “Valid row two” and “Valid row three”. A development warning lists the dropped indexes |
| **Edge-case values** | Awkward values (see the steps under [Data, ids and columns](#data-ids-and-columns)) | Dashes for non-finite numbers, literal markup, short object and array summaries |
| **Wide: 30 rows × 120 fields** | Generated rows with 120 fields | Horizontal scrolling and a long **Columns** list |
| **Large: 100,000 generated rows** | Generated employees, `pagination="scroll"`, height 600 | No page bar. Scrolling stays on a window of rows |
| **Host-managed (server) mode** | The same 50 employees, fetched one page at a time with a 600 ms delay | “Loading…” then the first page. Later pages keep the previous rows under a spinner |

**Test the default scenario**

1. Leave **Scenario** on **Default: 50 sample records**.
2. Confirm headers **Id**, **Name**, **Email**, **Avatar**, **Department**, **Role**, **Salary**, **Bonus Pct**, **Active**, **Start Date**, **Rating**, **Address**, **Bio**.
3. Confirm row `EMP-001` is Aarav Sharma, Engineering, address **Bengaluru, India**, and that **Active** is a check.
4. Confirm the page bar reads **1–25 of 50** and **Page 1 of 2**.

---

## Views

Three layouts share one data pipeline. **Table** is the default. **Grid** is a card layout. **List** is a single column of rows. Switching views keeps sort, search, filters, selection, page and column layout.

### How to open a view

The **View** control sits at the right of the toolbar. It is a radio group labeled **View**, with buttons **Table**, **Grid** and **List**. On a narrow viewport (480px or less) the words are hidden and the icons remain.

The switcher is hidden when `showViewSwitcher={false}`, or when `views` lists only one layout.

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
  cardFieldLimit={4} // extra fields shown per card / list item (default 6)
/>
```

Controlled view:

```tsx
const [view, setView] = useState<ViewType>('table');
<ReactDataGrid data={rows} view={view} onViewChange={setView} />;
```

**Card contents.** Each card shows the image (if any), the title, then up to `cardFieldLimit` other visible columns. The title and image do not count toward that limit.

**List contents.** Each item shows the image, the title, the subtitle, then up to `cardFieldLimit` other fields as “Header: value”.

**Custom layouts** replace only the card or list body. Focus, selection and the checkbox stay outside your markup:

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

`fields` items are `{ column, value, formattedValue, content }`. `content` is the same node the table would render.

### Test it

Sample data: the playground **Default: 50 sample records** scenario.

1. Click **Grid**. Cards show the avatar, the person’s name as the title, and fields such as Email and Department. Sort, search and filters from the table are still applied.
2. Click **List**. Each row leads with the avatar and name, then a secondary line and “Header: value” pairs.
3. Click **Table**. The same rows return, including the current page.
4. In **Grid**, narrow the window. The number of cards per row drops, and never goes below one.
5. To test a reduced switcher, render `views={['table', 'grid']}`. **List** is absent. Render `views={['table']}` and the switcher disappears.

### Works with

Search, filters, sort, paging, selection and column visibility apply in every view. The table is the only view with header sort buttons, drag-resize, drag-reorder and the column **⋮** menu. Grid and list use the toolbar **Sort by** dropdown instead (see [Sorting](#sorting)).

---

## Data, ids and columns

### Row ids

Ids keep selection stable when the array changes. Pass a field name, a nested path, or a function:

```tsx
<ReactDataGrid data={rows} getRowId="id" />
<ReactDataGrid data={rows} getRowId="meta.uuid" />
<ReactDataGrid data={rows} getRowId={(row, index) => row.sku} />
```

Without `getRowId`, or when any id is missing, empty or duplicated, **every** row falls back to its position in the source array and a development warning is logged. One bad id switches the whole set.

### Column definitions

Omit `columns` and the grid uses the union of keys, in first-seen order. Nested objects are not expanded unless you set a dot path. A key that itself contains a dot (`"a.b"`) is read as that literal key before any path split.

```tsx
import { ReactDataGrid, createColumns } from '@atharvaits/react-data-grid';

type Employee = { id: string; name: string; salary: number; active: boolean; start: string; address: { city: string } };

const columns = createColumns<Employee>([
  { field: 'name', header: 'Name', width: 200, pinned: 'start' },
  { field: 'salary', type: 'currency', formatOptions: { currency: 'EUR', maximumFractionDigits: 0 } },
  { field: 'start', header: 'Start date', type: 'date' }, // "2024-02-01" strings sort and filter as dates
  { field: 'address.city', header: 'City' },
  { id: 'label', header: 'Label', valueGetter: (row) => `${row.name} (${row.address.city})` },
  {
    field: 'active',
    header: 'Status',
    render: ({ value }) => <span className={value ? 'badge ok' : 'badge off'}>{value ? 'Active' : 'Inactive'}</span>,
  },
  { field: 'id', hidden: true, sortable: false, filterable: false, searchable: false },
]);

<ReactDataGrid data={employees} columns={columns} getRowId="id" />;
```

`createColumns` is a typed identity helper. It does not change the definitions.

| `ColumnDef` field | Purpose | Default |
|---|---|---|
| `field` | Dot path to the value (`address.city`); a key containing dots is read literally first | — |
| `id` | Unique id; required with `valueGetter` when there is no `field` | `field` |
| `header` | Header / label text | humanized field (`firstName` → “First Name”) |
| `type` | `auto`, `text`, `number`, `currency`, `percent`, `boolean`, `date`, `image`, `enum` | `auto` (inferred; strings are never inferred as numbers or dates) |
| `valueGetter(row)` | Derived value used for display, sort, filter and search | — |
| `valueSetter(row, value)` | Row to commit after a double-click edit. Required to edit a `valueGetter` column; reported as `onCellEdit` `nextRow` | — |
| `format(value, row)` | Display text only — sort, filter and search still use the raw value | locale-aware per type |
| `formatOptions` | `Intl` options, e.g. `{ currency: 'EUR' }`, `{ dateStyle: 'long' }` | currency defaults to USD |
| `render(ctx)` | Custom content in every view. `ctx`: `row, rowId, value, formattedValue, column, view, selected`. A column with `render` cannot be edited | — |
| `compare(a, b, rowA, rowB)` | Custom sort order | type-aware |
| `enumValues` | Values for the “is any of” filter | auto-collected when ≤ 20 values repeat |
| `width`, `minWidth`, `maxWidth` | Pixels (clamped) | auto, `60`, `800` |
| `align` | `start`, `center`, `end` | `end` for numeric types |
| `hidden`, `pinned` | Initial visibility; `'start'`, `'end'` or `null` | `false`, `null` |
| `sortable`, `filterable`, `searchable`, `resizable`, `reorderable`, `hideable` | Per-column switches | `true` (images are not searchable) |

**Type inference.** The first 100 non-empty values decide `auto`. A column of numbers, booleans, `Date`s, or image URLs gets that type. Everything else, including numeric-looking strings (`"42"`, `"2024-02-01"`), stays text until you set `type`.

**Percent.** `type: 'percent'` uses `Intl` percent style, which multiplies by 100. Store `0.15` to display 15%. The playground **Bonus Pct** column is a plain number, so `0.15` displays as `0.15` until you set `type: 'percent'`.

**Images.** A value is shown as an image when it is an `http(s)` URL ending in a common image extension, a `data:image/…` URI, a `blob:` URL, or a relative path (`/`, `./`, `../`). Anything else renders blank. Image columns are excluded from search.

**Enum values** are collected automatically when every non-empty value is a string or number, there are at most 20 distinct values, and those values actually repeat (distinct count × 2 ≤ row count). In the 50-employee sample, **Department** gets a pick list (Engineering, Design, Sales, Marketing, Finance, Operations). **Role** does not, because the roles do not repeat enough.

### Test it

Playground **Default: 50 sample records**:

1. **Address** reads “Bengaluru, India”, not a raw object, because the playground formats that column.
2. **Avatar** is a picture. **Start Date** is a formatted date. **Salary** is a locale number, right-aligned.
3. Hover Aarav Sharma’s **Bio**. The cell is truncated; the full biography is in the tooltip. Tab to the cell and the text expands.

Playground **Edge-case values**:

1. **Not a number**, **Positive infinity** and **Negative infinity** show `—` in the score column.
2. The row whose name is `<img src=x onerror=alert(1)>` shows that string as text.
3. **Array value** shows `alpha, beta, gamma +2`.
4. **Nested object** shows a short key summary such as `{city, zip, +1}`.
5. **Dotted key** shows “literal dotted key” under the header **A.b** (the literal key wins over a nested path).
6. Two rows share id `j`. The development console warns, and both rows still render (ids fell back to position).

Playground **Invalid items**: only the three named object rows appear.

### Works with

Column type decides sort order, filter operators and the inline editor. `hidden` columns stay out of the table, cards, list and search, but a filter or sort already stored on that id still runs.

---

## Sort, search and filter

Search runs first, then filters (combined with AND), then sort. Pagination slices that result. Changing search or filters returns to the first page.

```tsx
<ReactDataGrid
  data={rows}
  defaultSort={[{ columnId: 'salary', direction: 'desc' }]}
  multiSort // default false. Shift+click adds secondary sorts only when this is true
  defaultSearch=""
  searchDebounceMs={200}
  searchable // show the search box (default true)
  filterable // show the Filter button (default true)
  defaultFilters={[{ columnId: 'start', operator: 'between', value: '2024-01-01', value2: '2024-12-31' }]}
  onSortChange={(sort) => console.log(sort)}
  onSearchChange={(q) => console.log(q)}
  onFiltersChange={(filters) => console.log(filters)}
/>
```

Controlled: `sort` + `onSortChange`, `search` + `onSearchChange`, `filters` + `onFiltersChange`. If you control a value, update it from the callback or the control snaps back.

### Sorting

**What it does.** Orders matching rows. The sort is stable, language-aware (`item2` before `item10`, `é` next to `e`), and puts empty values last in both directions. Mixed columns order numbers, then text, then empty values.

**How to use it.**

- **Table:** click a header. The cycle is unsorted → ascending → descending → unsorted. The header exposes `aria-sort`. With `multiSort`, hold Shift while clicking to add another level. A small 1-based badge shows the priority when more than one column is sorted.
- **Table column menu:** open **{Header} column options** (the **⋮** button, or Alt+↓ / Shift+F10 on the header). **Sort ascending**, **Sort descending** and **Clear sort** replace the sort with that one column. They do not append a multi-sort level.
- **Grid and list:** the toolbar shows a **Sort by** dropdown and a direction button. Choosing a column replaces the whole sort with that single column. The direction button toggles ascending and descending. Its accessible name is **Sort ascending** or **Sort descending**.

`sortable: false` removes the header button and omits the column from **Sort by**.

### Search

**What it does.** Keeps rows whose visible, searchable columns contain the query. Matching is case- and accent-insensitive (`jose` finds `José`) and uses raw values, not formatted text. Dates are matched as `YYYY-MM-DD`. Hidden columns and image columns are skipped. If the query is non-empty and no searchable column remains, no rows match.

**How to use it.** The toolbar input is labeled **Search records** and shows the placeholder **Search…**. Typing commits after `searchDebounceMs` (default 200). Enter commits immediately. Escape, or the **Clear search** button, clears immediately. While a search or filter is active, a line under the toolbar shows “N results” and **Clear all**. That **Clear all** clears both the search and the filters.

Set `searchable={false}` to hide the box.

### Filters

**What it does.** Each active condition must match. A condition with a missing value is ignored, except boolean **is true** / **is false** and the empty checks, which apply immediately.

**How to use it.**

1. Click **Filter** in the toolbar. A dialog opens.
2. Click **Add filter**. A row appears for the first visible filterable column, using that type’s first operator and no value.
3. Set **Column**, **Condition** and **Value**. For **between**, a second box is labeled **Value 2**, with the word **and** between the boxes.
4. Close the dialog. Each active condition becomes a chip in the toolbar. The **Filter** button shows a count badge.
5. Remove one chip with its **Remove filter** button, or click **Clear all** inside the dialog to drop every condition (the search box is left as it is).

The **Filter** button is omitted when no visible column is filterable, even if `filterable` is true.

| Column type | Conditions, in menu order |
|---|---|
| text, or enum without a value list | contains, equals, starts with, ends with, is empty, is not empty |
| text / enum that has `enumValues` | is any of, then the text conditions |
| number / currency / percent | =, ≠, <, ≤, >, ≥, between, is empty, is not empty |
| date | before, after, on, between (inclusive), is empty, is not empty |
| boolean | is true, is false, is empty |

**is any of** shows a checkbox list. Text conditions use the same accent-insensitive match as search. **between** is inclusive and still matches if the two bounds are reversed.

Adding a filter on a boolean column selects **is true** immediately, so the grid narrows as soon as you pick that column.

### Test it

Playground **Default: 50 sample records**. Reset first so you start from page 1 of the unsorted 50.

**Sort**

1. Click the **Salary** header once. The lowest salaries come first (Daniel Thompson, 62000, is among the first rows) and the header is ascending.
2. Click **Salary** again. Ethan Davis (176000) moves to the top.
3. Click **Salary** a third time. The original order returns, with Aarav Sharma first.
4. Switch to **Grid**. Use **Sort by** → **Name**, then the direction button. Cards reorder A–Z, then Z–A. Switch back to **Table** and the same sort is still on **Name**.

**Search**

1. Type `jose` in **Search records**. After a brief pause, José Álvarez is the match and the summary reads **1 result**.
2. Press Escape. The box clears and all 50 rows return.
3. Type `madrid`. José Álvarez matches because search looks through the address text, not only the name.
4. Click **Clear all** under the toolbar. Search and any filters clear together.

**Filter**

1. Click **Filter**, then **Add filter**.
2. Set **Column** to **Department**, **Condition** to **is any of**, and check **Sales**. The badge shows 1. José Álvarez, Ethan Davis and the other Sales rows remain. Engineering rows do not.
3. Click the chip’s remove button. All departments return.
4. Add a filter, set **Column** to **Active**. The condition becomes **is true** at once, and inactive people (Liam Smith, Mia Dubois, Henry Thomas, and others) disappear before you type a value.
5. Set **Column** to **Salary**, **Condition** to **>**, **Value** to `150000`. Aarav Sharma (168000), Ethan Davis (176000) and the other salaries above 150000 remain.
6. Click **Clear all** in the filter dialog. The salary chip disappears. A search you typed earlier is still there until you clear the search box or use the summary **Clear all**.

### Works with

Search, filters and sort survive a view change. They reset the page to the first page. Hiding a column removes it from search and from the filter column list; a condition already applied to it still filters. Saved preferences store the sort, and do not store the search text, the filters, or the page. Server mode sends the same search, filters and sort to your fetch function instead of applying them in the browser.

---

## Pagination and scrolling

Page buttons are the default. Scroll mode renders only the visible window, including at 100,000 rows.

```tsx
// Pages (default). Built-in page size is 25, options [10, 25, 50, 100].
// `page` is 0-based. The footer shows “Page 1 of 2”.
<ReactDataGrid data={rows} defaultPageSize={50} pageSizeOptions={[25, 50, 100]} onPageChange={setPage} />

// Controlled page
<ReactDataGrid data={rows} page={page} onPageChange={setPage} pageSize={size} onPageSizeChange={setSize} />

// Continuous scrolling with virtualization
<ReactDataGrid data={bigArray} pagination="scroll" height={600} />
```

**How to use paging.** The footer is a navigation region. It shows:

- **Rows per page** — a dropdown. The playground offers 10, 25, 50 and 100.
- A range such as **1–25 of 50**.
- **First page**, **Previous page**, **Next page**, **Last page**. The buttons at the ends are disabled.
- A status such as **Page 1 of 2**.

Changing search or filters goes back to page 1. If the result shrinks, the page moves to the last valid page. Changing the page size keeps the first visible record on screen.

**How to use scrolling.** Set `pagination="scroll"`. The viewport height is `height`, or 600 when `height` is omitted or `'auto'`. There is no page footer. In page mode, `height` limits the table’s max height only; grid and list grow with the page.

`pagination="scroll"` is not available in server mode. The grid forces page mode and warns in development.

### Test it

**Pages** — playground **Default: 50 sample records**:

1. Confirm **1–25 of 50** and **Page 1 of 2**. **First page** and **Previous page** are disabled.
2. Click **Next page**. **Page 2 of 2** shows the remaining 25 employees. **Next page** and **Last page** are disabled.
3. Set **Rows per page** to 10. The range becomes **1–10 of 50** (or stays on the record that was at the top of the previous page).
4. Search `sales` and confirm the footer returns to the first page of the matches.

**Scroll** — playground **Large: 100,000 generated rows**:

1. The page footer is absent. The grid has a fixed-height scroller.
2. Scroll quickly. New rows appear and off-screen rows unmount. The header stays put.
3. Click **Reset** to leave this scenario. Generating 100,000 rows happens the first time you select it and can take a moment.

### Works with

Paging uses the rows that remain after search, filter and sort. Column layout and selection are kept when you change page. In client mode, **Select all** covers every matching row on every page. In server mode it covers the loaded page only.

---

## Server (host-managed) mode

For data that should not all be sent to the browser, the grid asks your app for one page at a time. The browser does not search, filter or sort that page locally. Your response is shown in the order you return it.

**Recommended form: `fetchData` returns a promise.** The grid aborts the previous request when a new one starts, and applies only the latest result.

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

If both `fetchData` and `onDataRequest` are set, `fetchData` is used. If neither is set, nothing is requested.

While a later page loads, a spinner shows over the rows already on screen. On error, a banner with **Retry** appears above those rows. The toolbar stays visible during the first load, including when the first page is empty. “Select all” covers the loaded page. Selection ids from other pages are kept, but their row objects are not in memory until that page is loaded again.

### Test it

Playground **Host-managed (server) mode**:

1. The toolbar appears immediately, then “Loading…”, then the first 25 of the 50 employees. The footer total is 50.
2. Click **Next page**. The current rows stay visible under a spinner for about 600 ms, then the next page replaces them.
3. Search `jose`. The grid asks for a new page; José Álvarez is returned and the total drops.
4. Clear the search. The full 50 are available again.
5. Click **Reset** to return to client mode.

To test the error banner, reject `fetchData` once and click **Retry**. The previous rows stay up, and the banner reads “Something went wrong while loading data.”

### Works with

Requires `dataMode="server"` and `fetchData` or `onDataRequest`. Provide `columns` when the first response may be empty, so the toolbar still knows which fields exist. Page size, sort, search and filters are inputs to `DataRequest`. Scroll mode is ignored.

---

## Selection and activation

Selection and activation are separate. A normal click runs `onRowActivate`. It does not select the row. Selection is the checkbox, the Space key, or a modifier click.

```tsx
const [selected, setSelected] = useState<string[]>([]);

<ReactDataGrid
  data={rows}
  getRowId="id"
  selectionMode="multi" // 'none' (default) | 'single' | 'multi'
  defaultSelection={['r1']}
  isRowSelectable={(row) => !row.archived}
  onSelectionChange={(ids, rows) => setSelected(ids)}
  onRowActivate={(row, id, event) => openDetails(id)} // click or Enter, in every view
/>
```

The playground leaves `selectionMode` at `'none'`, so checkboxes are not on that page. Use the snippet above to test selection.

| Mode | What you see | How to select |
|---|---|---|
| `none` | No checkbox | You cannot select. Click and Enter still activate |
| `single` | A checkbox on each row. No header checkbox | Click the checkbox or press Space. Choosing another row replaces the selection. Clicking the selected row clears it |
| `multi` | A checkbox on each row and in the header | Checkbox, Space, Shift+click or Shift+Space for a range, Ctrl/⌘+click to toggle, Ctrl/⌘+A for every selectable match |

After at least one row is selected, a bar shows **N selected**, **Select all N** (multi, when some selectable rows remain) and **Clear selection**. In server mode, when every selectable row on the page is selected, the bar says **All N on this page selected**.

`isRowSelectable` disables the checkbox and skips that row in ranges and select-all. A click on a link, button, input or other interactive element inside the row does not activate or select it.

In client mode, rows that disappear from new data are removed from the selection and `onSelectionChange` runs. Server mode does not prune ids when the page changes.

Controlled: `selection` + `onSelectionChange`.

### Test it

Use three rows `{ id: '1', name: 'Ada' }`, `{ id: '2', name: 'Grace' }`, `{ id: '3', name: 'Alan' }` with `getRowId="id"`.

1. With `selectionMode="multi"`, click the **Name** cell for Ada. `onRowActivate` fires and the checkbox stays clear.
2. Click Ada’s checkbox. The bar reads **1 selected**. The **Select all 3** button appears.
3. Shift+click Alan’s checkbox. Ada, Grace and Alan are selected.
4. Click **Clear selection**. The bar disappears.
5. Press Ctrl/⌘+A with focus in the grid. All three are selected.
6. Click the header checkbox once to select all, and again to clear.
7. Set `selectionMode="single"` and select Ada, then Grace. Only Grace stays selected. There is no header checkbox and no **Select all**.
8. Set `isRowSelectable={(row) => row.id !== '2'}`. Grace’s checkbox is disabled and is skipped by Shift+click and Ctrl/⌘+A.

Repeat the checkbox check in **Grid**. In **List**, selection uses a check mark on the row (`aria-selected` on `role="option"`) rather than a separate checkbox column.

### Works with

Selection is kept across view changes and pages. Search and filters change which rows **Select all** includes. `getRowId` is required if the selection should survive inserts and deletions. Persistence does not save the selection.

---

## Inline cell editing

Double-click a cell to edit it. The grid does not write the new value into `data`. `onCellEdit` tells you what changed, and you update your state (or send it to an API).

Editing is off until you pass `onCellEdit`. The playground does not pass it, so double-click does nothing there.

```tsx
type Person = { id: string; name: string; city: string; active: boolean; qty: number };

const [people, setPeople] = useState<Person[]>([
  { id: '1', name: 'Ada', city: 'London', active: true, qty: 2 },
]);

<ReactDataGrid
  data={people}
  getRowId="id"
  onCellEdit={(edit) => {
    setPeople((current) =>
      current.map((row) => {
        if (row.id !== edit.rowId) return row;
        // valueSetter columns already return the next row. Field columns use edit.field.
        return edit.nextRow ?? { ...row, [edit.field]: edit.value };
      }),
    );
  }}
/>
```

**How to edit**

1. Double-click the cell in the table, or the same field on a card or list item.
2. Change the value. Text and numbers use a text box (numbers use a decimal keypad on mobile). Dates that are `Date` objects or `YYYY-MM-DD` strings use a date input. Booleans use a checkbox. Columns with `enumValues` use a dropdown.
3. Press Enter to save. Press Escape, or move focus away, to cancel. A cancelled edit does not call `onCellEdit`.
4. An invalid number (for example `abc` in a number column) is discarded and `onCellEdit` is not called.

**Which columns can be edited**

- A column with `field` and no `valueGetter` and no `render`.
- A `valueGetter` column only when it also has `valueSetter`. The callback receives `nextRow` from `valueSetter`.
- A column with `render` is never edited.

```tsx
{
  id: 'label',
  header: 'Label',
  valueGetter: (row) => `${row.name} (${row.city})`,
  valueSetter: (row, value) => {
    const text = String(value ?? '');
    const match = /^(.*)\(([^()]*)\)\s*$/.exec(text);
    if (!match) return { ...row, name: text.trim() };
    return { ...row, name: match[1]!.trim(), city: match[2]!.trim() };
  },
}
```

Double-click **Label**, change `Ada (London)` to `Grace (Paris)`, press Enter. `onCellEdit` includes `value: 'Grace (Paris)'` and `nextRow` with `name: 'Grace'` and `city: 'Paris'`. If you omit `valueSetter`, the double-click does nothing.

### Test it

1. Render the `people` example.
2. Double-click **Ada**. A text box labeled **Name** opens with the text selected.
3. Type `Grace` and press Enter. The cell shows Grace. `onCellEdit` was called with `field: 'name'`, `previousValue: 'Ada'`, `value: 'Grace'`.
4. Double-click Grace, type `Ada`, and press Escape. The cell stays Grace.
5. Double-click the quantity `2`, type `abc`, and press Enter. The cell stays `2`.
6. Double-click the quantity, type `4`, and press Enter. The cell shows 4.
7. Switch to **Grid** (`defaultView="grid"`), double-click **London**, change it to **Paris**, press Enter. The card updates.
8. Add `render: () => <span>Custom</span>` on `name` and double-click **Custom**. No editor opens.

### Works with

Requires `onCellEdit`. Uses the column type from [Data, ids and columns](#data-ids-and-columns). A click that starts the editor does not also toggle selection. `onRowActivate` still runs for a single click. The edited value is what later sorts, filters and searches see only after you put it back into `data`.

---

## Column management and saved preferences

In the table, users can resize columns (drag the header edge, or Alt+←/→), reorder them (drag a header, or **Move left** / **Move right** in the column menu), hide or show them, and pin them to the start or end. Hidden columns and column order also apply to the grid and list. Resize, drag-reorder and pin chrome are table-only.

```tsx
<ReactDataGrid
  data={rows}
  enableColumnResize
  enableColumnReorder
  enableColumnHide
  enableColumnPin // all default true
  defaultColumnState={[{ id: 'notes', order: 5, hidden: true }]}
  onColumnStateChange={(state) => save(state)}
  persistStateKey="orders-grid" // remember view, sort, page size and column layout
  onStateChange={(state, changed) => console.log(changed, state)}
/>
```

### Resize

Drag the right edge of a table header (the handle is titled **Resize column**). Width is clamped between `minWidth` (default 60) and `maxWidth` (default 800). Keyboard: focus the header and press Alt+← or Alt+→ to change the width by 10 pixels. In right-to-left layout the drag direction is mirrored.

Turn it off with `enableColumnResize={false}` or `resizable: false` on that column.

### Reorder

Drag a table header onto another header. Both columns must be reorderable. Dropping onto a pinned group pins the dragged column with that group. The column menu items **Move left** and **Move right** step through visible neighbours. In right-to-left layout, “left” means visually left.

### Hide and show

Two places:

- Toolbar **Columns**. Each hideable column is a checkbox. Uncheck to hide, check to show.
- Table column menu → **Hide column**.

The last visible column cannot be hidden. Its checkbox and menu item are disabled. Hidden columns leave search and the filter column dropdown. They still honor a filter or sort that was already set.

`hideable: false` keeps that column out of the **Columns** list and disables **Hide column**. `enableColumnHide={false}` hides the **Columns** button entirely.

### Pin

Open the column **⋮** menu and choose **Pin to start**, **Pin to end**, or **Unpin**. Pinned columns stay fixed while the middle scrolls horizontally. `enableColumnPin={false}` removes those three menu items. There is no per-column pin flag; use `pinned` on the column definition for the initial state.

### Saved preferences

Set `persistStateKey` to remember **view**, **sort**, **page size** and **column layout** under `localStorage["@atharvaits/react-data-grid:<key>"]`. Selection, search, filters and the current page are never saved.

Saved data is checked on load. Unknown columns and views that are not in `views` are ignored. If storage is unavailable, preferences stay in memory for the page lifetime. Controlled props always win over saved values. Restore happens after mount, so the first paint (including server rendering) uses the defaults, then the saved view can replace an uncontrolled default.

The playground does not set `persistStateKey`. Pass one in your own page to test it.

### Test it

Playground **Default: 50 sample records**, table view. Click **Reset** before you start.

1. **Resize.** Drag the edge of **Name** until the header is much wider. Reload is not required; the new width stays until **Reset**.
2. **Reorder.** Drag the **Role** header onto **Name**. Role now sits where Name was. Or open **Name column options** and click **Move right**. Name swaps with the next visible column.
3. **Hide.** Click **Columns** and uncheck **Bio**. Bio disappears from the table. Switch to **Grid** and confirm Bio is not on the cards. Check **Bio** again.
4. Open **Columns** and uncheck every box except one. The last checked box is disabled.
5. **Pin.** Open **Name column options** → **Pin to start**. Scroll horizontally (use the **Wide: 30 rows × 120 fields** scenario if the default table fits). Name stays at the left. Choose **Unpin** to release it.
6. **Preferences.** Render `persistStateKey="demo"`, hide **Email**, sort by **Salary** descending, set **Rows per page** to 50, and switch to **Grid**. Reload the page. Those four choices return. Type a search, select a row, and go to page 2, then reload. The search, selection and page do not return.
7. Click **Reset** in the playground. The default scenario remounts and the column layout returns to the original order.

### Works with

Hide, order and pin change card and list fields because those views use the visible column order. Resize is stored in the same column state as hide and pin. Persistence can override `defaultView`, `defaultSort`, `defaultPageSize` and `defaultColumnState` after the first paint. It does not override controlled `view`, `sort`, `pageSize` or `columnState`.

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

`colorScheme: 'auto'` follows `prefers-color-scheme`. `'dark'` always uses the dark tokens. `'light'` keeps the light tokens. `density` sets the row height: compact 32px, standard 40px, comfortable 52px. The playground uses `auto`, `standard`, and a slightly rounder corner (`radius: '8px'`).

Every token is a CSS custom property on `.aits-root`:

```css
.my-grid {
  --aits-color-accent: #7a2ec9;
  --aits-row-height: 36px;
}
```

Tokens: `colorBg`, `colorSurface`, `colorSurfaceAlt`, `colorBorder`, `colorText`, `colorTextMuted`, `colorAccent`, `colorAccentText`, `colorSelectedBg`, `colorFocusRing`, `colorDanger`, `fontFamily`, `fontSize`, `radius`, `spacing`, `rowHeight`, `headerHeight`, `cardGap`, `shadow`. Each maps to `--aits-<kebab-case>`.

All package styles sit in the `@layer aits` cascade layer, so your own unlayered CSS wins. Stable class hooks: `.aits-root`, `.aits-toolbar`, `.aits-table`, `.aits-header-cell`, `.aits-row`, `.aits-cell`, `.aits-grid`, `.aits-card`, `.aits-list`, `.aits-list-item`, `.aits-pagination`, `.aits-empty`, `.aits-error`. State attributes: `[data-selected]`, `[data-pinned]`, `[data-density]`, `[data-color-scheme]`, `[data-view]`.

### Test it

1. Render with `theme={{ density: 'compact' }}`. Rows are shorter than the playground’s standard density. Switch to `comfortable` and they grow.
2. Render with `theme={{ colorScheme: 'dark' }}`. The surface is dark even if the operating system is in light mode.
3. Render with `theme={{ tokens: { colorAccent: '#7a2ec9' } }}` and focus a header. The focus ring uses that color.
4. Add a stylesheet rule `.my-grid { --aits-color-accent: #0f7b6c; }` on `className="my-grid"`. The accent updates without a `theme` token.

### Works with

`tokens.rowHeight` (a value like `36px`) also sets the virtual row height in scroll mode. `cardGap` changes the visual gap; the number of cards per row is still computed with a 16px gap.

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
  // every key on defaultMessages can be replaced, including operators
};

<ReactDataGrid data={rows} messages={fr} locale="fr-FR" direction="auto" />;
```

- `locale` controls number and date formatting and text sort order. It defaults to the browser language, and to `en-US` on the first render and during server rendering.
- `messages` translates the interface. A partial `operators` map is merged with the English operators, so you can replace one label without listing the rest.
- `direction`: `'ltr'`, `'rtl'`, or `'auto'` (inherited from the page). Layout, pinning, resizing, the view switcher and the arrow keys mirror in right-to-left mode.

### Test it

1. Pass `locale="de-DE"` and a numeric salary. The salary uses German grouping. The buttons stay in English until you pass `messages`.
2. Pass the `fr` object above. The search placeholder reads **Rechercher…**, and the page range uses “sur”.
3. Pass `direction="rtl"`. The first column sits on the right, **Move left** follows the visual left, and the page arrows point the other way.
4. Wrap the grid in `<div dir="rtl">` and leave `direction="auto"`. The grid picks up the inherited direction.

### Works with

`locale` does not translate button text. `messages` does not change sort collation or number formatting. Right-to-left mode changes resize, pin and keyboard arrows together; test those from [Column management](#column-management-and-saved-preferences) and [Accessibility](#accessibility) after setting `direction="rtl"`.

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

| Situation | Default UI | When |
|---|---|---|
| Empty | “No data to display” | Client data normalizes to zero rows and there is no search or filter. The toolbar is hidden |
| No results | “No matching results” and **Clear all** | Rows exist (or server mode is on) but the current search, filters or page has nothing to show. The toolbar stays |
| Loading | “Loading…” with a spinner, or five skeleton rows when nothing is on screen yet | `loading`, or an in-flight `fetchData` |
| Error | “Something went wrong while loading data.” and **Retry** | `error` is anything other than `undefined`, `null` or `false` (including `''` and `0`) |

`noResultsContent` receives `clearFilters`, which clears search and filters. `errorContent` receives `error` and `retry`.

### Test it

1. Playground **Empty array** and **data = null**: “No data to display”, no search box.
2. Playground **Default: 50 sample records**: search `zzzzz`. “No matching results” appears, the toolbar remains, and **Clear all** restores the 50 rows.
3. Playground **Host-managed (server) mode**: “Loading…” shows before the first rows, and again as an overlay when you change page.
4. Pass `error="offline"` with some `data`. The error banner sits above the rows. Pass `error={false}` and the banner hides.
5. Pass `emptyContent={<p>No orders yet.</p>}` with `data={[]}`. The paragraph replaces the default sentence.

### Works with

No-results depends on search and filters. Loading and error are part of [Server mode](#server-host-managed-mode), and they also render in client mode when you pass `loading` or `error`.

---

## Accessibility

The component targets **WCAG 2.2 AA**. It follows the WAI-ARIA grid, listbox and radio-group patterns: one tab stop per widget, visible focus, polite announcements of result counts, and correct row and column positions even while virtualized. Name the grid with `aria-label` or `aria-labelledby`. The playground names it “Employees”.

| Where | Keys |
|---|---|
| Table / grid view | ←/→/↑/↓ move · Home/End (row start/end) · Ctrl+Home/End (first/last) · PageUp/PageDown |
| List view | ↑/↓ · Home/End · PageUp/PageDown |
| Any record | Enter = activate (`onRowActivate`) · Space = select · Shift+Space = select range · Ctrl/⌘+A = select all |
| Table header | Enter/Space = sort (Shift = add to multi-sort when `multiSort` is on) · Alt+↓ or Shift+F10 = column menu · Alt+←/→ = resize |
| View switcher | ←/→ (↑/↓) · Home/End |
| Menus / dialogs | ↑/↓ in menus · Esc closes and returns focus |

Arrow keys are not stolen while focus is inside an input, textarea, select, or the open editor. Filter and **Columns** dialogs trap Tab and close with Escape.

Result counts are announced when search, filters, sort or the total change. Page changes announce the “from–to of total” range.

### Test it

1. Tab once into the playground grid. Focus lands on a single cell, not on every cell.
2. Use the arrow keys to move. Home and End jump along the row.
3. Press Enter on a data cell. Nothing is selected (selection is off in the playground). With `onRowActivate`, the callback runs.
4. Focus a header and press Enter. The column sorts, the same as a click.
5. Press Alt+↓ on a header. **Name column options** (or that column’s name) opens. Escape returns focus to the **⋮** button.
6. Search `jose`. A screen reader using the polite live region hears “1 result”.

### Works with

Selection keyboard shortcuts need `selectionMode` other than `'none'`. Multi-sort from the header needs `multiSort`. Right-to-left mode swaps Left and Right. The cell editor handles its own Enter and Escape.

---

## Server-side rendering

`ReactDataGrid` renders on the server (`renderToString`, Next.js, Remix, …) without touching `window` or `document`. It shows the first page (or the first 50 rows in scroll mode), hydrates without mismatches, and then applies the browser locale and any saved preferences.

```tsx
// Next.js App Router
'use client';
import { ReactDataGrid } from '@atharvaits/react-data-grid';
import '@atharvaits/react-data-grid/styles.css';

export function PeopleTable({ people }: { people: Person[] }) {
  return <ReactDataGrid data={people} aria-label="People" />;
}
```

### Test it

1. Render the component with `renderToString` (or a framework server render) and a few rows.
2. The HTML contains the first page of cells and does not throw on `window` or `localStorage`.
3. Hydrate on the client. The text does not change unless the browser language differs from `en-US`, or a `persistStateKey` restores a saved view.
4. With `pagination="scroll"`, the server HTML includes the first window of rows (50), not the full array.

### Works with

Saved preferences and the browser locale apply after hydration. Give the grid an `aria-label` in the server markup so the name is present before JavaScript runs.

---

## Browser support

The latest two versions of Chrome, Edge, Firefox and Safari, on desktop and mobile. Internet Explorer is not supported.

---

## Props reference

All props are optional. For controllable state, `x` makes it controlled, `defaultX` sets the initial value when uncontrolled, and `onXChange` reports every change. An empty string or empty array still counts as controlled.

### Data

| Prop | Type | Default |
|---|---|---|
| `data` | `readonly TRow[] \| null \| undefined` | `[]` |
| `getRowId` | `string \| (row, index) => string \| number` | row position |
| `columns` | `ColumnDef<TRow>[]` | derived from data |
| `dataMode` | `'client' \| 'server'` | `'client'` |
| `fetchData` | `(req: DataRequest, { signal }) => Promise<{ rows, totalCount }>` | — |
| `onDataRequest` | `(req: DataRequest) => void` | — |
| `totalCount` | `number` | `data.length` in client mode; the host total in server mode |
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

### Pagination and scrolling

| Prop | Type | Default |
|---|---|---|
| `pagination` | `'pages' \| 'scroll'` | `'pages'` |
| `page` / `defaultPage` / `onPageChange` | `number` (0-based) | `0` |
| `pageSize` / `defaultPageSize` / `onPageSizeChange` | `number` | `25` |
| `pageSizeOptions` | `number[]` | `[10, 25, 50, 100]` |
| `height` | `number \| string` | unset in page mode; `600` in scroll mode when unset or `'auto'` |

### Selection and interaction

| Prop | Type | Default |
|---|---|---|
| `selectionMode` | `'none' \| 'single' \| 'multi'` | `'none'` |
| `selection` / `defaultSelection` / `onSelectionChange` | `RowId[]`; callback `(ids, rows)` | `[]` |
| `isRowSelectable` | `(row) => boolean` | all rows |
| `onRowActivate` | `(row, id, event) => void` | — |
| `onCellEdit` | `(edit: { row, rowId, columnId, field, previousValue, value, nextRow? }) => void` | editing off |

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
| `locale` | `string` | browser language (`'en-US'` on the server and the first paint) |
| `direction` | `'ltr' \| 'rtl' \| 'auto'` | `'auto'` |
| `messages` | `Partial<Messages>` | `defaultMessages` |
| `emptyContent` / `noResultsContent` / `loadingContent` / `errorContent` | `ReactNode \| (ctx) => ReactNode` | built-in |
| `className` / `style` / `id` / `aria-label` / `aria-labelledby` | standard | — |

### Exports

`ReactDataGrid`, `createColumns`, `defaultMessages`, and the types `ReactDataGridProps`, `ColumnDef`, `ColumnType`, `CellContext`, `CellEdit`, `CardContext`, `CardField`, `ListItemContext`, `ViewType`, `SortItem`, `SortDirection`, `FilterCondition`, `FilterOperator`, `SelectionMode`, `RowId`, `GridState`, `ColumnStateItem`, `DataRequest`, `DataPage`, `FetchDataOptions`, `Theme`, `ThemeToken`, `Density`, `ColorScheme`, `Messages`, `StateContent`, `StateContentContext`.

## License

MIT
