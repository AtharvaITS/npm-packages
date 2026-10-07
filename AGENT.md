# ReactDataGrid — implementation reference

This repository is an npm workspaces monorepo. The product is `@atharvaits/react-data-grid` (`packages/react-data-grid`, current package version `1.0.2`). `apps/playground` is a Vite app that exercises the component. There are no other packages.

The component renders an array of record objects as a **table**, a **card grid**, or a **list**. Client mode runs search, filters, and sort in the browser. Server mode asks the host for one page at a time. React 18+ is the only peer dependency. The published bundle is ESM + CJS plus `styles.css`, with no runtime dependencies.

This document describes the code as it exists. It is a reference for future changes. Do not treat the package README as more authoritative than the source when they differ; both were checked against `packages/react-data-grid/src`.

---

## Repository layout

| Path | Role |
|---|---|
| `packages/react-data-grid/src/index.ts` | Public exports: `ReactDataGrid`, `createColumns`, `defaultMessages`, and the public types |
| `packages/react-data-grid/src/ReactDataGrid.tsx` | Root component: state, pipeline, selection, column actions, empty/loading/error branching, toolbar, pagination |
| `packages/react-data-grid/src/types.ts` | All public prop and data types |
| `packages/react-data-grid/src/core/` | Pure functions: normalize, columns, column state, search, filter, sort, pipeline, pagination, selection, format, persistence |
| `packages/react-data-grid/src/state/` | Controllable state, grid context, server fetching, persistence hook |
| `packages/react-data-grid/src/views/` | Table, card grid, list, cell rendering, selection checkbox, icons |
| `packages/react-data-grid/src/toolbar/` | Search, filters, sort menu, columns, view switcher, selection bar, popover |
| `packages/react-data-grid/src/pagination/` | Page controls |
| `packages/react-data-grid/src/states/` | Empty, no-results, loading, error |
| `packages/react-data-grid/src/a11y/` | Roving tabindex and the polite live region |
| `packages/react-data-grid/src/virtual/` | Fixed-size windowing |
| `packages/react-data-grid/src/styles/` | `tokens.css` and `grid.css`, both inside `@layer aits`. The build concatenates them into `dist/styles.css` |
| `packages/react-data-grid/src/i18n/messages.ts` | English `defaultMessages` and `mergeMessages` |
| `apps/playground/` | Scenario switcher and Playwright e2e tests |

Root scripts: `npm run dev` (playground), `npm run build`, `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, `npm run size`.

---

## 1. Available features

1. Zero-config table from an array of objects, with derived columns.
2. Three views: table, card grid, and list, with an optional switcher and custom card/list renderers.
3. Client-side search, typed filters (AND), and stable multi-column sort.
4. Page controls, or virtual scrolling for large client data sets.
5. Server (host-managed) mode via `fetchData` or `onDataRequest`.
6. Row selection: none, single, or multi, plus row activation.
7. Column resize, reorder, hide/show, and pin (table interactions; visibility and order apply to every view).
8. Saved preferences in `localStorage` (view, sort, page size, column layout).
9. Theming (CSS variables, density, light/dark/auto) and localization (messages, locale, LTR/RTL).
10. Keyboard and screen-reader behavior (roving focus, live region, ARIA grid/listbox).
11. Server rendering without `window` on the first render.
12. Empty, no-results, loading, and error states, each replaceable.

`createColumns` is an identity function. It exists so column arrays keep the row type parameter.

---

## 2. How the component is wired

`ReactDataGrid` (`ReactDataGrid.tsx`) is the only public component. It builds one `GridContext` and renders:

1. `Toolbar` when `dataMode="server"` or the normalized row list is non-empty.
2. `ErrorState` when `error` is not `undefined`, `null`, or `false`.
3. One body: loading skeleton, empty, no-results, `GridView`, `ListView`, or `TableView`.
4. `Pagination` when pagination is `pages` and `totalCount > 0`.
5. A polite `LiveRegion`.

Child views read everything through `useGrid()`. Using those internals outside the provider throws.

### Data flow (client mode)

```
props.data
  → normalizeData (drop non-objects)
  → resolveRowIds
  → resolveColumns (explicit defs, or union of keys)
  → applyColumnState (order, hide, pin, width)
  → runPipeline: search → filter → sort
  → pageSlice (pages) or full index list (scroll)
  → TableView | GridView | ListView
```

The pipeline returns indexes into the normalized row array. It never mutates `data`, the column definitions, or the index input arrays.

### Data flow (server mode)

`useServerData` requests `{ requestId, page, pageSize, sort, filters, search }`. The host returns one page. The client pipeline is skipped: display indexes are `0..rows.length-1` in the order the host sent. `pagination="scroll"` is rejected in development and forced to `pages`.

### Render branch

Evaluated in this order:

| Condition | UI |
|---|---|
| Loading and no rows yet | `LoadingOverlay` with five skeleton rows |
| `dataCount === 0` and no active search/filters | `EmptyState` |
| `totalCount === 0` or the current page has no indexes | `NoResultsState` if any source rows exist or server mode is on; otherwise `EmptyState` |
| `view === 'grid'` | `GridView` |
| `view === 'list'` | `ListView` |
| otherwise | `TableView` |

If loading is true and rows are already on screen, the current view stays and a non-skeleton overlay is added. An error banner can sit above a populated view.

`dataCount` is the client source length, or the server `totalCount`. `totalCount` in client mode is the pipeline match count. In server mode it is `max(server.totalCount, rows.length)`.

---

## 3. Feature implementations

### 3.1 Data normalization and row ids

**Files:** `core/normalize.ts`

- `null` and `undefined` become zero rows. No warning.
- A non-array logs one dev warning and becomes zero rows.
- Array items that are not plain objects (including arrays, `null`, numbers, strings) are dropped. One warning lists up to ten source indexes.
- The input array is never mutated.
- `getValue(row, path)` reads a dot path. If the row has an own property whose name is the full path (a key that contains dots), that property wins over path splitting.

**Row ids** (`resolveRowIds`):

- `getRowId` omitted, `''`, or producing any missing/empty/non-string/non-number id, or any duplicate: the **entire** set falls back to stringified source indexes (indexes in the host array, not the compacted list). A dev warning is logged. Selection then tracks position and will not survive inserts or deletions.
- A string `getRowId` is a field path (`"id"`, `"meta.uuid"`). A function receives `(row, sourceIndex)`.
- Valid ids are `String(raw)`. Internal type `RowId` is always a string.

### 3.2 Columns

**Files:** `core/columns.ts`, `core/columnState.ts`, `core/format.ts`, `views/cellContent.tsx`

If `columns` is omitted, columns are the union of own keys of object rows, first-seen order. Nested keys are not expanded unless a column `field` uses a dot path.

Resolution (`resolveColumns`):

- `id` defaults to `field`. A column with neither is skipped (dev warning).
- Duplicate ids are renamed to `` `${id}__${n}` `` starting at 2 (dev warning).
- `type: 'auto'` or omitted is inferred from the first 100 non-empty values. Strings are never inferred as numbers or dates. If every sampled non-empty value is a number, boolean, `Date`, or an image URL/data URI, that type is used; otherwise `text`. An all-empty column is `text`.
- Image URL pattern: `data:image/…` or `http(s)` URL ending in png, jpg, jpeg, gif, webp, svg, avif, or bmp.
- `enumValues`, when omitted on `text` or `enum`, are auto-collected only when every non-empty value is a string or number, there are at most 20 distinct values, and distinct count × 2 ≤ row count (values actually repeat). They are sorted with `localeCompare`.
- Defaults: `minWidth` 60, `maxWidth` 800, `sortable`/`filterable`/`resizable`/`reorderable`/`hideable` true, `searchable` true except `image`, `hidden` false, `pinned` null. Numeric types (`number`, `currency`, `percent`) default `align` to `end`.
- Explicit `width` is clamped to min/max.
- Header text defaults to a humanized field: `firstName` → `First Name`, `address.city` → `Address City`.

`valueGetter` errors become `undefined`. `format` errors become `''`. `render` errors are `console.error`'d and the cell content is `null`.

**Display** (`formatValue` / `formatCell`):

- `format` is display-only. Sort, filter, and search use the raw value (or `valueGetter`).
- Empty (`null`, `undefined`, `''`) displays as an empty string. `NaN`, non-finite numbers, and invalid dates display as `—` when formatted as numbers or dates.
- Currency defaults to USD. Percent uses `Intl` `style: 'percent'`, which multiplies by 100, so `0.25` displays as 25%.
- Date-only strings `YYYY-MM-DD` are parsed as local calendar dates, not UTC midnight. Other strings and numbers go through `new Date`.
- Booleans render a check or cross with visually hidden “Yes”/“No”, unless `format` is set.
- Images render `<img alt="" loading="lazy">` only when the string matches `https?:`, `data:image/`, `blob:`, `/`, or `./` / `../`. Anything else renders nothing. `format` on an image column disables the image branch and uses text.
- Arrays show up to three items, then ` +N`. Plain objects show up to two keys, then ` +N`. Cycles render `[Circular]`. Functions and symbols warn once and render blank. Markup in strings is a text node, never HTML.

Default layout widths when the user has not set one: text 180, enum 150, number 120, currency 130, percent 100, boolean 100, date 140, image 96. Clamped to min/max.

### 3.3 Views

**Files:** `views/table/*`, `views/grid/*`, `views/list/*`, `toolbar/ViewSwitcher.tsx`, `state/useGridState.ts`

Allowed views default to `table`, `grid`, `list`. `views` filters to those three, drops duplicates, and falls back to all three if the result is empty. `view` / `defaultView` outside the allowed list warns and uses the first allowed view. Default view is `table` when it is allowed, otherwise the first allowed view.

The switcher is a `radiogroup`. It is omitted when `showViewSwitcher={false}` or only one view is allowed. On viewports ≤ 480px the text labels are visually hidden; the icons remain.

Switching views does not clear sort, search, filters, selection, page, or column state. `data-view` on `.aits-root` is the active view.

**Table** (`role="grid"`):

- Sticky header row. Optional 44px select column, pinned to the inline start.
- `aria-rowindex` is absolute (header is 1, first data row of page 0 is 2). `aria-rowcount` is `totalCount + 1` so positions stay correct across pages and virtual windows.
- Flexible columns grow to fill the container, up to `maxWidth`. Pinned columns, columns with an explicit width, and the column currently being resized stay fixed. Growth uses pixel tracks, not `fr`.
- Pinned cells use `position: sticky` and `inset-inline-start` / `inset-inline-end`.
- Zebra striping is CSS `nth-child(even)` on **rendered** body rows.
- Cell `title` is the formatted text (not for custom `render` or images), so truncated text is available on hover.

**Card grid** (`role="grid"`, each card is `gridcell`):

- Column count is `max(1, floor((width + 16) / (cardMinWidth + 16)))`. Default `cardMinWidth` is 240. The 16px gap matches the default `--aits-card-gap`, but the count is a JS constant, not the CSS variable.
- Default body: optional image, title, then up to `cardFieldLimit` (default 6) visible columns excluding the title and image columns. Fields are a `<dl>` with the column header as `<dt>`.
- `renderCard` replaces the body. The checkbox, focus, and selection attributes stay outside that render.
- Virtualization is by visual row, not by card. `initialCount` before measurement is 12 visual rows.

**List** (`role="list"`, or `role="listbox"` when selection is on):

- Default body: image, primary line (title), secondary line (subtitle), then up to `cardFieldLimit` remaining fields as “Header: value”.
- Subtitle defaults to the second visible non-image column. Title defaults to the first visible non-image column, else the first visible column. `titleField` / `subtitleField` / `imageField` are column ids. A named field is found even if that column is hidden.
- With selection, items are `role="option"` with `aria-selected`. The check mark is decorative (`aria-hidden`); it is not a checkbox. `aria-posinset` / `aria-setsize` use the absolute match position and `totalCount`.
- `renderListItem` replaces the body the same way `renderCard` does.

`CardContext` / `ListItemContext`: `{ row, rowId, selected, toggleSelected, fields }`. Each field is `{ column, value, formattedValue, content }`. `content` is the same node the table would render, including custom `render`.

### 3.4 Sort

**Files:** `core/sort.ts`, `views/table/HeaderCell.tsx`, `toolbar/SortMenu.tsx`

Sort state is `SortItem[]` of `{ columnId, direction: 'asc' | 'desc' }`. Default is `[]` (source order).

Header cycle (`toggleSort`): none → asc → desc → none. Shift+click is additive only when `multiSort` is true; otherwise any click replaces the sort with that single column. Non-sortable columns are skipped by `sortIndexes`.

Column menu sort actions always replace the sort with one column (or remove that column for “Clear sort”). They do not append a multi-sort level.

Grid and list views hide header sort buttons and show `SortMenu` instead. That menu edits only `sort[0]` and writes a one-item array, so using it collapses a multi-sort.

Comparator details:

- Active items whose column is missing or `sortable: false` are ignored. If none remain, order is unchanged.
- Empty values (`null`, `undefined`, `''`, `NaN`, invalid dates) sort **last in both directions**.
- Otherwise numbers (and dates, booleans as 0/1, bigint via `Number`) rank before text. Text uses `Intl.Collator` with `numeric: true` and `sensitivity: 'base'` for `locale` (falls back if the locale is invalid).
- A column `compare(a, b, rowA, rowB)` replaces the default comparison. Empty values are still forced last. The numeric result is multiplied by direction.
- The sort is stable: equal keys keep pipeline order (original index order before this sort).
- Keys are precomputed per column. The row array is not mutated.

`aria-sort` is `ascending`, `descending`, or `none` on sortable headers. When more than one sort item is active, a 1-based priority badge is shown on each sorted header.

### 3.5 Search

**Files:** `core/search.ts`, `toolbar/SearchBox.tsx`

The toolbar search box is shown when `searchable !== false`. It is a `role="search"` input.

- Typing updates local text immediately and commits after `searchDebounceMs` (default 200). `0` or less commits immediately. Enter commits immediately. Escape clears immediately. The clear button commits immediately.
- An external change (controlled `search`, or Clear all) overwrites the input.
- Unmount clears a pending timer, so a debounce that has not fired is dropped.
- Committing search resets the page to 0.

Matching (`searchIndexes`):

- Query and cell text are Unicode-normalized (NFD), combining marks stripped, then lowercased. `jose` matches `José`.
- The query must be a substring of the joined searchable text.
- Only columns that are `searchable` and not hidden are included. Hiding a column changes the search set and re-runs the pipeline. If no such column exists, every row is excluded while the query is non-empty.
- Raw values are searched, not formatted text. Dates become `YYYY-MM-DD`. Nested objects/arrays are flattened up to depth 2. Numbers that are not finite, functions, and symbols contribute nothing.
- Folded text is cached on the row object with a `WeakMap`, keyed by the searchable column id list. In-place mutation of a row does not invalidate that cache.

### 3.6 Filters

**Files:** `core/filter.ts`, `toolbar/FilterPanel.tsx`

`filterable !== false` shows the Filter button, but the button is omitted when no visible column is `filterable`.

Operators by resolved type:

| Type | Operators, in UI order |
|---|---|
| number, currency, percent | `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `between`, `isEmpty`, `isNotEmpty` |
| date | `before`, `after`, `on`, `between`, `isEmpty`, `isNotEmpty` |
| boolean | `isTrue`, `isFalse`, `isEmpty` |
| text / enum with enum values, or type `enum` | `in`, then `contains`, `equals`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty` |
| other text | the text operators without `in` |

Conditions are AND. A condition is ignored when the column is missing, `filterable` is false, the operator is not allowed for the type, a required value is missing, `in` has an empty array, or `between` is missing either bound. `between` is inclusive and swaps the bounds if they are reversed. Text operators use the same accent-insensitive fold as search. `in` compares folded text. `isTrue` / `isFalse` are strict `=== true` / `=== false`. `isEmpty` is null, undefined, `''`, or `NaN`.

The Filter popover lists **visible** filterable columns. “Add filter” appends a condition on the first of those columns using that type’s first operator and no value. For booleans the first operator is `isTrue`, which is active immediately. For other types the new row does nothing until a value is entered (or the user picks `isEmpty` / `isNotEmpty`).

Active conditions render as chips in the toolbar. Chip remove and the panel’s Clear all clear filters only. The result summary’s Clear all clears **search and filters**.

Changing filters resets the page to 0. `hasActiveConditions` (search trim non-empty, or any condition that `buildPredicate` accepts) drives the result summary and the empty vs no-results branch.

Programmatic filters may target hidden columns; the engine still applies them. The panel cannot edit a hidden column because it is not in the dropdown.

### 3.7 Pagination and virtual scrolling

**Files:** `core/paginate.ts`, `pagination/Pagination.tsx`, `virtual/useVirtualRows.ts`

`pagination` defaults to `pages`. Page index is **0-based** in state and props. The UI shows 1-based “Page X of Y”.

- Default page size is 25. Options default to `[10, 25, 50, 100]`. A page size outside the options warns once and is still used; the `<select>` adds it to the list.
- `clampPage` keeps the page in range. An effect writes the clamped page back unless server data is loading (so a shrinking result set does not fight an in-flight request).
- Search and filter changes go to page 0. Changing page size uses `pageForFirstVisible`: the first record that was visible stays on screen (`floor(firstIndex / newSize)`).
- Range text uses `pageRange`. An empty total is `0–0`.
- First/prev/next/last buttons disable at the ends.

Scroll mode (`pagination="scroll"`):

- The scrollport height is `height`, or **600** when `height` is omitted or `'auto'` (dev warning for `'auto'`). In page mode, a numeric/string `height` other than `'auto'` sets `maxHeight` on the table only; grid and list do not use it unless scrolling.
- Only a window of rows is mounted. Overscan is 5 items on each side. Before `ResizeObserver` measures the viewport, the first 50 items render (12 visual rows in the card grid).
- Item size is `rowHeight` for the table. Cards and list items measure the first rendered `.aits-grid-row` or `.aits-list-item` and fall back to an estimate until then.
- Scroll handlers are passive and coalesced with `requestAnimationFrame`.
- Keyboard moves call `scrollToIndex` so the active row is brought into the viewport.
- `aria-rowindex` / `aria-posinset` stay absolute; they are not the index inside the mounted window.

Server mode always uses pages.

### 3.8 Server mode

**File:** `state/useServerData.ts`

`dataMode="server"` is required. Two host styles:

1. **`fetchData(req, { signal }) => Promise<{ rows, totalCount }>`** (preferred). Each query change aborts the previous `AbortController`, increments `requestId`, and applies a result only if it is still the latest and not aborted. Abort errors are ignored. Other rejections set `error` and keep the previous rows. A non-array `rows` becomes `[]`. `totalCount` is used only when it is a number ≥ `rows.length`; otherwise it becomes `rows.length`. Retry increments an attempt counter and re-invokes `fetchData`. `onRetry` is also called.
2. **`onDataRequest(req)`** plus host-supplied `data`, `totalCount`, `loading`, `error`, and `onRetry`. The hook does not fetch. If `onRetry` is set, Retry does not also bump the internal attempt (the host refetches). If `onRetry` is omitted, Retry re-emits `onDataRequest` with a new `requestId`.

If both callbacks are passed, a warning is logged and `fetchData` wins. If neither is passed, a warning is logged and no request runs.

In client mode the same hook still surfaces `props.loading`, `props.error`, and `props.onRetry`. `onRetry` with no `fetchData` still fires; the attempt counter bumps only when `onRetry` is absent.

Server selection “select all” covers the **loaded page**, because pipeline indexes are that page. The selection bar says “All N on this page selected” when every selectable row on the page is selected. Client mode’s select-all covers every matching row on every page.

Selection is **not** pruned when server pages change. Ids from other pages can remain selected even though their row objects are not in memory. `onSelectionChange` only includes row objects that are in the current page’s `idToIndex` map; other ids are still in the id list.

### 3.9 Selection and activation

**Files:** `core/selection.ts`, `views/SelectCheckbox.tsx`, `views/table/Row.tsx`, `views/grid/Card.tsx`, `views/list/ListItem.tsx`, `toolbar/SelectionBar.tsx`

`selectionMode` defaults to `'none'`.

| Mode | Behavior |
|---|---|
| `none` | No checkbox, no `aria-selected`. Click and Enter call `onRowActivate`. |
| `single` | Toggle replaces the selection. Clicking the selected row clears it. No header checkbox, no select-all, no shift range. |
| `multi` | Toggle adds/removes. Shift extends from the last anchor through the current display order (pipeline order, which is all matches in client mode). Ctrl/⌘+click toggles. Ctrl/⌘+A selects every selectable match (current page in server mode). Header checkbox selects all matches or clears. |

`isRowSelectable` defaults to all rows. A throw is treated as not selectable. Non-selectable rows get `aria-disabled` and a disabled checkbox (table/grid) or a disabled-looking check (list).

Pointer behavior, same in all three views:

- Click on a link, button, input, select, textarea, label, summary, `role="button|checkbox|link"`, or `contenteditable` does **not** activate or select the row (`isInteractiveTarget`).
- Shift+click in multi mode selects the range and does not activate.
- Ctrl/⌘+click toggles and does not activate.
- Any other click activates (`onRowActivate(row, id, event)`).

Checkboxes are `tabIndex={-1}`. Keyboard selection is Space on the roving cell, not Tab onto the checkbox. The checkbox `onClick` stops propagation so it does not also activate the row. Shift+click on the checkbox selects a range.

The selection anchor is the last toggled id. It is cleared on Clear selection. Range select skips ids that fail `isRowSelectable`.

In client mode, when `rowIds` change, ids that no longer exist are removed and `onSelectionChange` runs if the list changed. Server mode does not prune.

`onSelectionChange(ids, rows)` is called by the component, not by the controllable-state hook, because the callback needs row objects. `rows` contains only rows currently loaded.

The selection bar appears when mode is not `none` and at least one id is selected. It shows the count, “Select all N” when multi and not everything selectable is selected, and Clear.

### 3.10 Column resize, reorder, hide, pin

**Files:** `core/columnState.ts`, `views/table/useColumnResize.ts`, `views/table/useColumnReorder.ts`, `views/table/ColumnMenu.tsx`, `toolbar/ColumnsButton.tsx`

Flags `enableColumnResize`, `enableColumnReorder`, `enableColumnHide`, and `enableColumnPin` default to **true**. Per-column `resizable`, `reorderable`, and `hideable` default to true. There is no per-column pin flag; pin is global via `enableColumnPin`.

`applyColumnState` merges `ColumnStateItem` (`id`, `order`, optional `width`, `hidden`, `pinned`) over resolved columns:

- Unknown state ids are ignored. Columns without state keep definition order.
- Display order is pinned-start, then unpinned, then pinned-end. Inside a group, state `order` is used for columns that have state; others keep definition index.
- If every column would be hidden, the first column in that order is forced visible.
- `setColumnHidden(true)` returns `null` when it would hide the last visible column, and the UI does not apply it. The Columns checkbox and the menu’s Hide item are disabled in that case.

**Resize** (table only): pointer-drag on `.aits-resize-handle` keeps a local draft width and commits on pointer up, clamped to min/max and rounded. RTL reverses the drag delta. Keyboard: Alt+ArrowLeft / Alt+ArrowRight on the header cell changes width by 10px. In RTL, ArrowLeft grows the column. The handle is `aria-hidden`; the keyboard path is the accessible control.

**Reorder** (table headers): HTML5 drag-and-drop between header cells. Both the dragged column and the drop target must be `reorderable`. Dropping into another pin group adopts that group’s `pinned` value. The column menu’s Move left / Move right steps among **visible** neighbors. Labels swap in RTL so “left” means visually left. Drag uses MIME `application/x-aits-grid-column`.

**Hide/show:** column menu and the toolbar Columns popover. Hidden columns leave the table and are omitted from card/list fields and from search. They remain in `ctx.columns` (ordered, including hidden).

**Pin:** menu items Pin to start, Pin to end, Unpin. Pinned columns are fixed-width in the flex layout and sticky.

### 3.11 Persistence

**Files:** `core/persist.ts`, `state/usePersistence.ts`

Off unless `persistStateKey` is set. Storage key: `@atharvaits/react-data-grid:` + key. Payload version is `1`. Unknown versions are discarded.

Saved fields: `view`, `sort`, `pageSize`, `columns`, `formatRules`, `headerStyle`. **Not saved:** selection, search, filters, page.

Restore runs once per key, after columns exist, in a layout effect (so it does not run during SSR). It only fills **uncontrolled** view, sort, page size, column state, formatting rules, and header style. An empty `formatRules` array or empty `headerStyle` object is a real saved delete and replaces defaults. Missing fields on older payloads are left alone. Controlled props win. Restore is silent (no `onChange` / `onStateChange`).

Writes are debounced 300ms and flushed on unmount. Invalid JSON, unknown column ids, and views that are not allowed are dropped on read. If `localStorage` throws or is missing, an in-memory `Map` is used for the page lifetime. Writes never throw.

### 3.12 Theming, density, direction

**Files:** `styles/tokens.css`, `styles/grid.css`, theme block in `ReactDataGrid.tsx`

Root class is `aits-root`, plus `className`. Attributes: `data-view`, `data-density`, `data-color-scheme`. `dir` is set only for `ltr` and `rtl`. `auto` leaves `dir` unset and reads computed `direction` after layout.

`theme.colorScheme` defaults to `auto` (dark tokens under `prefers-color-scheme: dark`). `dark` always applies dark tokens. `light` keeps the default light tokens.

`theme.density` defaults to `standard`. It sets `--aits-row-height` / `--aits-header-height` and the virtual row height: compact 32, standard 40, comfortable 52. `theme.tokens.rowHeight` overrides the pixel height only when the value matches `/^(\d+(?:\.\d+)?)px$/`.

`theme.tokens` keys map to `--aits-` kebab-case (`colorAccent` → `--aits-color-accent`) and are written as inline style, then `props.style` is spread on top.

All component CSS is in `@layer aits`, so unlayered host CSS overrides it. Stable hooks include `.aits-root`, `.aits-toolbar`, `.aits-table`, `.aits-header-cell`, `.aits-row`, `.aits-cell`, `.aits-grid`, `.aits-card`, `.aits-list`, `.aits-list-item`, `.aits-pagination`, `.aits-empty`, `.aits-error`. State attributes: `data-selected`, `data-pinned`, `data-density`, `data-color-scheme`, `data-view`, `data-state` (`empty`, `no-results`, `loading`, `error`), `data-row-id`, `data-column-id`.

`prefers-reduced-motion: reduce` disables the spinner and skeleton animation. `forced-colors: active` outlines the selected row and uses `Highlight` for focus and the checked view option.

Import styles once: `@atharvaits/react-data-grid/styles.css`.

### 3.13 Localization and announcements

**Files:** `i18n/messages.ts`, `a11y/LiveRegion.tsx`

`messages` is a partial overlay on `defaultMessages`. `operators` is merged key-by-key so a partial operator map does not drop the rest.

`locale` formats numbers and dates and builds the sort collator. When omitted, the first render (including SSR) uses `en-US`, then a layout effect switches to `navigator.language` if it differs. An invalid locale falls back inside `Intl` constructors.

Announcements (`aria-live="polite"`, debounced 150ms): a change of search, filters, sort, or `totalCount` announces `resultsCount`. A page or page-size change announces `pageRange`. Identical consecutive strings get a trailing NBSP so assistive tech re-reads them.

### 3.14 Keyboard and focus

**File:** `a11y/useRovingFocus.ts`

One tab stop per view. Arrow keys move a roving `tabIndex`. Items carry `data-aits-r` and `data-aits-c`.

| Surface | Keys |
|---|---|
| Table and card grid | Arrows. Home/End move to the row edges. Ctrl/⌘+Home/End jump to the first/last cell. PageUp/PageDown move by the visible row count. Left/Right swap in RTL. |
| List | Up/Down, Home/End, PageUp/PageDown. Left/Right are ignored because there is one column. |
| Record | Enter activates. Space toggles selection (header Space sorts or toggles select-all). Shift+Space range-selects in multi mode. |
| Table header | Enter/Space sorts (Shift adds a level only if `multiSort`). Alt+ArrowDown, ContextMenu, or Shift+F10 opens the column menu. Alt+Left/Right resizes. |
| View switcher | Arrow keys move and select. Home/End jump. RTL swaps Left/Right. |
| Menus | Up/Down/Home/End. Esc closes and returns focus. Tab closes a menu. |
| Dialogs (filter, columns) | Focus moves in, Tab wraps, Esc closes and returns focus. `aria-modal` is false. |

Keys from `input`, `textarea`, `select`, or `contenteditable` inside a cell are not stolen. Keys whose default was already prevented, and keys from inside `.aits-popover`, are ignored.

Popover (`toolbar/Popover.tsx`): `position: fixed`, promoted with the Popover API (`showPopover`) when available so it escapes overflow clipping. It flips above the anchor if it would overflow the viewport, clamps to an 8px margin, and closes when the anchor is scrolled fully out of a clipping ancestor or the viewport. Outside pointerdown closes it. Dialog focus is trapped. Menu items use `menuitem` or `menuitemcheckbox`.

### 3.15 Empty, loading, and error content

**Files:** `states/*`

Each slot is a `ReactNode` or `(ctx) => ReactNode`.

| Prop | Context fields | Default |
|---|---|---|
| `emptyContent` | `messages` | “No data to display” |
| `noResultsContent` | `messages`, `clearFilters` | “No matching results” plus a Clear all button |
| `loadingContent` | `messages` | Spinner plus “Loading…” |
| `errorContent` | `messages`, `retry`, `error` | Message plus Retry |

The toolbar is hidden when client data normalizes to zero rows, so empty data has no search box. No-results still shows the toolbar because source rows exist. Server mode always shows the toolbar, including while the first request is loading (skeleton plus toolbar).

### 3.16 Controlled and uncontrolled state

**File:** `state/useControllableState.ts`, `state/useGridState.ts`

Each of these is independent: `view`, `sort`, `search`, `filters`, `page`, `pageSize`, `selection`, `columnState`.

- The state is controlled when the value prop is not `undefined` (including `null` only if the type allowed it; these values do not use `null`). An empty string or empty array is controlled.
- Uncontrolled state starts at `defaultX` (or the built-in default) and updates internally.
- `onXChange` fires for requested changes in both modes, except silent persistence restore.
- In controlled mode the internal value is ignored. The host must set the prop from the callback or the UI snaps back on the next render.
- `onStateChange(fullState, changedKey)` fires for every reported key, including controlled updates, using a ref copy of state. Selection’s dedicated `onChange` on the controllable hook is intentionally unset; `onSelectionChange` is invoked from `commitSelection` instead. `onStateChange` still receives `selection`.

Side effects inside setters:

- `setSearch` and `setFilters` also set page to 0.
- `setPageSize` also moves to the page that keeps the first visible index.
- `setPage` floors and clamps at 0. The upper bound is applied later by `clampPage`.
- Setters no-op when the next value is `Object.is` to the current one, except `setSort` and `setFilters`, which always report.

### 3.17 Development warnings

**File:** `dev/warn.ts`

`warn(instanceKey, message)` prints `[ReactDataGrid] …` once per component instance per message. It is a no-op when `process.env.NODE_ENV === 'production'`. Triggers include bad `data`, bad `getRowId`, skipped or duplicate columns, disallowed `view`, `pageSize` outside options, server mode missing a callback or given both, scroll pagination in server mode, scroll mode with `height="auto"`, and function/symbol cell values.

---

## 4. UI and behavior details worth remembering

- Root element is a `div.aits-root`, not a table. Table semantics are ARIA (`role="grid"` / `row` / `columnheader` / `gridcell`) on divs.
- Page mode with no `height` grows with the page. Scroll mode always has a fixed viewport.
- A plain click selects nothing. It activates. Selection is the checkbox, Space, or a modifier click.
- Header checkbox exists only for `selectionMode="multi"`.
- Sort indicators and `aria-sort` are table-only. Other views use the toolbar sort `<select>`.
- Result summary (“N results” + Clear all) appears only while search or a real filter is active.
- Filter chips use the condition index as the React key.
- Long cell text is single-line ellipsis. `:focus-visible` on the text span expands it (`white-space: normal`) so keyboard users can read it. The `title` attribute repeats the formatted string.
- Even-row background is based on DOM order. In scroll mode the stripe phase changes as rows mount and unmount.
- Select column is always pinned start and is not a data column. It is included in `aria-colcount` and `aria-colindex`.
- Icons are inline SVG, `aria-hidden`, `currentColor`. Chevron icons use class `aits-icon-flip-rtl` so paging arrows mirror.
- `id`, `aria-label`, and `aria-labelledby` go on the root for `id`, and on the grid/list element for the names. Listbox without an accessible name falls back to the “List” message.

---

## 5. Dependencies and feature interactions

There is no runtime dependency besides React and React DOM. `Intl`, `ResizeObserver`, `localStorage`, `AbortController`, and the Popover API are used when present. Missing `ResizeObserver` leaves virtual measurement at 0 and the pre-measure window stays mounted. Missing Popover API still positions with `fixed`.

Interactions that are easy to break:

| Change | What else moves |
|---|---|
| Search or filters | Page resets to 0. Match count, selection header state, select-all set, and the live region update. Empty vs no-results can swap. |
| Hide a column | It leaves search, the filter column list, card/list fields, and the table. An existing filter on that id still applies. Sort on that id still applies. |
| Pin or reorder | Table sticky offsets, card/list field order (visible order), and persisted column state. |
| View switch | Same data and state. Sort UI changes (headers vs `SortMenu`). List semantics change when selection is on. |
| Page size | Page index changes to keep the first visible record. Persisted when a key is set. |
| New client `data` | Columns re-infer if `columns` was omitted. Row ids recompute. Selection is pruned to surviving ids. Page is clamped. |
| Server query change | Previous fetch is aborted. Rows stay visible until the new page arrives, with the loading overlay. Selection is not pruned. |
| `multiSort` off | Shift+click does not add a level. The sort menu and column menu always write a single level anyway. |
| Controlled `page` | The component still calls `onPageChange(0)` after search/filter and `onPageChange` after clamp. If the host ignores it, the page prop wins. |
| `persistStateKey` | Restores over uncontrolled defaults after mount, which can replace `defaultView` / `defaultSort` / `defaultPageSize` / `defaultColumnState`. |
| `locale` | Sort order and formatted numbers/dates. It does not translate UI strings; `messages` does. |
| `direction` | Pin offsets (logical CSS), resize sign, reorder labels, view-switcher arrows, and roving Left/Right. |
| Custom `render` | If it returns a button or link, row click will not activate. Keyboard arrows still move unless focus is in an input. |
| `cardFieldLimit` | Caps extra fields in both grid and list. Title, subtitle, and image do not count toward the limit. |
| Selection + server paging | “Select all” and the header checkbox mean the current page. The id list can contain ids whose rows are not loaded. |

Pipeline order is fixed: **search, then filter, then sort**. Pagination slices after that. Selection range order is the sorted match order, not the original array order.

---

## 6. Rules, conventions, and patterns

- New query logic belongs in `src/core/` as pure functions. UI reads it through context. Do not mutate `props.data`.
- Public types live in `types.ts` and are re-exported from `index.ts`. Internal types (`ResolvedColumn`, `EffectiveColumn`, `GridContextValue`) are not exported.
- Controllable state uses `useControllableState`. Do not store a second copy of view, sort, search, filters, page, page size, selection, or column state in a child.
- User-facing strings go through `messages`. Do not hardcode English in new UI.
- Layout that must work in RTL uses logical properties (`inset-inline-*`, `padding-inline`, `text-align: start/end`) or an explicit `rtl` branch.
- Cell content must not assign `dangerouslySetInnerHTML`. Default rendering is text. Images use a src allowlist.
- Dev diagnostics go through `warn(warnKey, message)` so they stay once-per-instance and disappear in production.
- CSS class prefix is `aits-`. New rules go in `grid.css` inside `@layer aits`. Tokens go in `tokens.css` as `--aits-*`.
- Imports stay at the top of the module.
- Switches on discriminated unions need a `never` default.
- The package build (`tsup`) emits `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, and concatenates the two CSS files into `dist/styles.css`. `react` and `react-dom` stay external.
- `sideEffects` is CSS only.
- Size budget in `.size-limit.json` is 60 KB gzip for JS + CSS. The README describes the bundle as about 38 KB gzipped; the enforced limit is 60 KB.

---

## 7. Testing

### Package tests (Vitest)

`npm test` runs `vitest run` in `packages/react-data-grid`. Config: `packages/react-data-grid/vitest.config.ts`.

| Project | Environment | What it covers |
|---|---|---|
| `dom` | jsdom | `tests/unit/**` (normalize, columns, filter, sort, search, selection, paginate, format, persist, virtual range, controllable state), `tests/component/**` (table, views, sort/search/filter, selection, keyboard, a11y, columns, server mode, customization, popover placement, multi-instance, edge cases), and `tests/types/public-api.test-d.ts` |
| `ssr` | node | `renderToString` and hydration |
| `perf` | node | `tests/perf/pipeline.perf.test.ts` (not part of the default `dom` include; `npm run bench -w packages/react-data-grid`) |

`tests/setup.ts` is the jsdom setup. `tests/fixtures/edge-cases.ts` mirrors the playground edge-case rows.

Component tests render `ReactDataGrid` with Testing Library. Accessibility tests use `vitest-axe`. Type tests assert the public export surface.

### Playground

`apps/playground/src/data/scenarios.ts` scenarios: 50 sample rows, empty array, `data: null`, invalid items, edge-case values, 30×120 fields, 100,000 rows with `pagination="scroll"`, and server mode via `createFakeServer` (600ms delay).

`npm run test:e2e` runs Playwright from the playground (`e2e/playground.spec.ts`, `e2e/column-menu.spec.ts`, `e2e/performance.spec.ts`).

### What to test when changing a feature

- **Pipeline:** empty query, accent folding, hidden searchable columns, invalid filter operators ignored, `between` order, empty values last in both sort directions, stable tie break, custom `compare`.
- **Paging:** page clamp when matches shrink, page reset on search/filter, page-size change keeps the first visible index, 0-based state vs 1-based label.
- **Selection:** single vs multi, shift range across a non-selectable row, Ctrl/⌘+A scope (all matches vs server page), prune on client data change, activate vs select click targets, `onSelectionChange` row list.
- **Columns:** cannot hide the last column, reorder adopts the target pin group, resize clamp, RTL resize direction, at least one column visible after bad persisted state.
- **Persistence:** controlled props are not overwritten, version mismatch discarded, unknown column ids dropped, selection/search/filters/page absent from the payload.
- **Server:** abort on a new query, stale response ignored, `totalCount` raised to `rows.length`, scroll prop forced to pages, loading overlay while previous rows remain, error retry.
- **SSR:** first render locale `en-US`, no `localStorage` read during render, scroll mode emits only the initial window.
- **A11y:** one tab stop, `aria-rowindex` absolute under virtualization, listbox vs list, live region on filter and page changes.

### Edge cases the implementation already handles

- Inconsistent keys across rows (derived columns are a union; missing values are blank).
- Literal dotted keys (`"a.b"`) preferred over nested paths.
- Duplicate or missing `getRowId` → positional ids and a warning.
- `NaN`, infinities, invalid `Date`, bigint, cycles, functions, symbols, long strings, and HTML-looking strings.
- Non-object rows dropped.
- All columns hidden → first column shown.
- Filter/search with no legal matches → no-results, distinct from empty data.
- `fetchData` rejection vs abort.
- Storage quota failure → memory map.
- Popover inside a transformed containing block (measures a 0,0 origin).

---

## 8. Limitations and known behaviors

These are consequences of the current code, not a backlog.

- **Server mode cannot virtual-scroll.** `pagination="scroll"` is ignored and a warning is issued.
- **Server “select all” is the current page**, not the full `totalCount`. Selection ids are not pruned when the page changes, and rows for off-page ids are omitted from `onSelectionChange`.
- **Search cache is per row object.** Mutating a row in place without changing its identity can leave a stale search string until the searchable column set changes.
- **Percent values are fractions.** `25` formats as 2,500%, not 25%.
- **Strings are not auto-typed as numbers or dates.** `"42"` and `"2026-01-05"` stay text unless `type` is set. They will not use numeric/date operators or numeric sort.
- **Enum pick lists are heuristic.** They appear only when values repeat and there are ≤ 20 distinct strings or numbers. Otherwise there is no `in` operator.
- **Adding a boolean filter applies `isTrue` immediately.**
- **Sort menu and column-menu sort replace the whole sort with one column.** Multi-sort is only the Shift+click path, and only when `multiSort` is true.
- **Hidden columns drop out of search and out of the filter picker**, but an already stored filter or sort on that id still runs.
- **Card column count ignores a custom `--aits-card-gap`.** The wrap math always uses 16px. The CSS gap does follow the token, so a changed gap can desync the column count from the visual gap.
- **Flex columns stop at `maxWidth` and do not hand leftover space to other columns.** If the container is wider than the sum of max widths, empty space remains. Default `maxWidth` is 800.
- **Zebra stripes follow mounted rows**, so virtual scrolling shifts which records look even.
- **Empty client data hides the toolbar.** You cannot type a search until rows exist. Server mode shows the toolbar even when the first page is empty.
- **`error={false}`, `null`, and `undefined` hide the banner.** Any other value, including `0` or `''`, shows it.
- **Scroll mode with `height="auto"` or omitted `height` uses 600px.**
- **Grid and list views ignore `height` in page mode.** Only the table sets `maxHeight`.
- **`getRowId` is all-or-nothing.** One duplicate or one missing id switches every row to positional ids.
- **Auto-inferred columns change when `data` changes** and `columns` is omitted, including when a server page has a different shape.
- **Persistence does not save search, filters, selection, or page**, and it does not override controlled props. It does save formatting rules and header style. Restore happens after mount, so the first client paint can differ from the saved view (SSR and hydration stay on the default).
- **Debounced search is not flushed on unmount.**
- **Custom `render` that throws leaves the cell empty** after logging. It does not fall back to formatted text.
- **List selection has no real checkbox**, only a decorative check. The accessible state is `aria-selected` on `role="option"`.
- **Images with unsafe or non-URL values render as empty** (or an empty media frame on cards/list). There is no broken-image icon.
- **`onRowActivate` is not called for modifier-clicks** that select, or for clicks that start on interactive custom content.
- **Page size outside `pageSizeOptions` warns but works.**
- **Both `fetchData` and `onDataRequest`:** only `fetchData` runs.
- **Internet Explorer is not a target.** The README states the latest two versions of Chrome, Edge, Firefox, and Safari. The implementation uses `Intl`, `ResizeObserver` (optional), CSS cascade layers, and optionally the Popover API.
- **CI** (`.github/workflows/ci.yml`) runs `npm ci`, `npm run typecheck`, and `npm run build` on Node 20 and 24. It does not run the Vitest or Playwright suites.

---

## 9. Playground defaults

`apps/playground/src/App.tsx` mounts one grid with search, filters, all three views, column resize/reorder/hide/pin, page size 25, height 600, `selectionMode: 'none'`, `multiSort: false`, `direction: 'auto'`, and `theme.colorScheme: 'auto'`. The 100k scenario turns on scroll mode. Server mode uses the 50-row sample through a fake delayed `fetchData`. Reset remounts the grid with a new React `key`, which clears uncontrolled state.

---

## 10. Public props (defaults from code)

| Prop | Default |
|---|---|
| `data` | empty when nullish |
| `getRowId` | source index |
| `columns` | derived |
| `dataMode` | `'client'` |
| `view` / `defaultView` | `'table'` if allowed |
| `views` | table, grid, list |
| `showViewSwitcher` | `true` |
| `cardMinWidth` | `240` |
| `cardFieldLimit` | `6` |
| `multiSort` | `false` |
| `searchable` | `true` |
| `searchDebounceMs` | `200` |
| `filterable` | `true` |
| `pagination` | `'pages'` (`'pages'` forced in server mode) |
| `defaultPage` | `0` |
| `defaultPageSize` | `25` |
| `pageSizeOptions` | `[10, 25, 50, 100]` |
| `height` | unset in page mode; `600` in scroll mode when unset or `'auto'` |
| `selectionMode` | `'none'` |
| `enableColumnResize` / `Reorder` / `Hide` / `Pin` | `true` |
| `theme.colorScheme` | `'auto'` |
| `theme.density` | `'standard'` |
| `locale` | `'en-US'`, then `navigator.language` |
| `direction` | `'auto'` |
| `messages` | `defaultMessages` |
| `persistStateKey` | off |
