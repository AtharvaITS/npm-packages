# Data Model: ReactDataGrid

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-25

This package has no database. The "data model" here is the set of in-memory structures the component accepts, derives, and reports. The exact prop signatures are in [contracts/component-api.md](./contracts/component-api.md).

---

## 1. Row (spec: *Record*)

A single item supplied by the host.

| Attribute | Type | Rules |
|---|---|---|
| *(any field)* | `unknown` | Arbitrary keys; values may be any type. |

**Validation / normalization** (FR-004, input-data edge cases):

- Non-object items (`null`, primitives, arrays) are **dropped** and trigger one dev warning: `"Skipped N invalid rows at indexes …"`.
- The supplied array and its rows are never mutated (FR-005). All ordering is done on an index array.
- Values are read with `getValue(row, fieldPath)`. A path is a dot-separated string (`address.city`), and a key that contains a literal dot is read if it exists as its own key before any path splitting.

## 2. Data Set

| Attribute | Type | Rules |
|---|---|---|
| `rows` | `readonly Row[]` | `null`/`undefined`/non-array → treated as `[]`, with a dev warning for non-arrays. |
| `totalCount` | `number` | Host-managed mode only. Must be ≥ `rows.length`, otherwise the component uses `rows.length`. |

## 3. Row Identity

| Attribute | Type | Rules |
|---|---|---|
| `getRowId` | `string` (field path) or `(row, index) => string \| number` | Optional. |
| resolved `RowId` | `string` | Always stored as a string internally. |

**Rules** (FR-007, R11):

- No `getRowId` → id = `String(index in supplied array)`.
- Declared id is missing or duplicated for some rows → the whole data set falls back to index identity, and one dev warning lists the conflicting ids. Selection is then not guaranteed to survive data changes (documented edge case).

## 4. Column (spec: *Field / Column Definition*)

| Attribute | Type | Default | Rules |
|---|---|---|---|
| `field` | `string` (path) | — | Required unless `valueGetter` + `id` are given. |
| `id` | `string` | `field` | Unique across columns. Duplicates trigger a dev warning, and the later column gets a `__2` suffix. |
| `header` | `string` | humanized `field` (`firstName` → "First Name", `snake_case` → "Snake Case", `address.city` → "Address City") | |
| `type` | `'text' \| 'number' \| 'boolean' \| 'date' \| 'currency' \| 'percent' \| 'image' \| 'enum' \| 'auto'` | `'auto'` | `auto` is inferred from the first 100 non-empty values (see §4.1). |
| `valueGetter` | `(row) => unknown` | — | A derived value, used for display, sort, filter, and search (US6 scenario 4). |
| `format` | `(value, row) => string` | type default (locale-aware) | Display only. Sort, filter, and search use raw values (FR-021). |
| `render` | `(ctx) => ReactNode` | — | Custom content, used in every view (FR-031). |
| `width` / `minWidth` / `maxWidth` | `number` (px) | `auto` / `60` / `800` | `minWidth ≤ width ≤ maxWidth`, clamped. |
| `align` | `'start' \| 'center' \| 'end'` | `end` for number/currency/percent, else `start` | Logical direction, so it works in RTL. |
| `hidden` | `boolean` | `false` | |
| `pinned` | `'start' \| 'end' \| null` | `null` | |
| `sortable` / `filterable` / `searchable` / `resizable` / `reorderable` / `hideable` | `boolean` | `true` | |
| `compare` | `(a, b, rowA, rowB) => number` | type default | Custom sort comparison (FR-017). |
| `enumValues` | `readonly unknown[]` | auto-collected if ≤ 20 distinct values | Drives the pick-from-values filter. |
| `formatOptions` | `{ currency?, maximumFractionDigits?, dateStyle?, … }` | — | Passed to the `Intl` formatters. |

### 4.1 Auto-derived columns and type inference (FR-002)

- When `columns` is omitted, the columns are the **union of top-level keys** in the order each key is first seen across rows.
- Nested plain objects are **not** auto-expanded. They display as a short summary (`{city, zip, +1}`) (edge case).
- More than 100 keys → all are kept for the table. Grid and list views show the first `cardFieldLimit` (default 6) (edge case).
- **Type inference** over sampled non-empty values:
  - all `number` → `number`
  - all `boolean` → `boolean`
  - all `Date` instances → `date`
  - all strings that are image URLs or `data:image/` URIs → `image` (not searchable by default)
  - otherwise `text`

  Strings are **never** inferred as numbers or dates. The developer must declare the `type` (edge case: "numbers or dates stored as text").

### 4.2 Value display rules (FR-003, FR-006)

| Raw value | Default display |
|---|---|
| `null` / `undefined` / `''` | empty cell |
| `number` (finite) | `Intl.NumberFormat(locale)` |
| `NaN` / `±Infinity` | `—` (em dash) |
| `bigint` | `toLocaleString(locale)` |
| `boolean` | ✓ / ✗ icon with accessible "Yes"/"No" text |
| `Date` (valid) | `Intl.DateTimeFormat(locale, { dateStyle: 'medium' })` |
| `Date` (invalid) | `—` |
| array | first 3 items joined with ", " + `+N` |
| plain object | key summary; a circular reference shows as `[Circular]` |
| function / symbol | empty, plus a dev warning once per column |
| string | as-is, rendered as a React text node (never as HTML) and truncated with an ellipsis via CSS. The full value goes in `title` and is revealed on focus. |

## 5. View

| Attribute | Type | Default | Rules |
|---|---|---|---|
| `view` | `'table' \| 'grid' \| 'list'` | `'table'` | Must be in `views`. Otherwise it falls back to the first allowed view, with a dev warning. |
| `views` | `ViewType[]` | all three | An empty array is treated as all three. With one entry, the switcher is hidden (US2 scenario 4). |
| `titleField` | column id | first visible column | Grid and list views (US2 scenario 7). |
| `subtitleField` | column id | second visible column | List view primary/secondary lines. |
| `imageField` | column id | first `image`-typed column, else none | Grid view. |
| `cardMinWidth` | `number` px | `240` | Grid view column count = `floor(width / cardMinWidth)`, at least 1. |
| `cardFieldLimit` | `number` | `6` | |
| `renderCard` / `renderListItem` | `(ctx) => ReactNode` | — | Custom layouts (US6 scenario 5). |

## 6. View State (spec: *View State*)

The single object reported by `onStateChange` and persisted in part.

| Attribute | Type | Initial |
|---|---|---|
| `view` | `ViewType` | `defaultView` or `'table'` |
| `sort` | `SortItem[]` — `{ columnId, direction: 'asc' \| 'desc' }` | `[]` (original order) |
| `filters` | `FilterCondition[]` | `[]` |
| `search` | `string` | `''` |
| `page` | `number` (0-based) | `0` |
| `pageSize` | `number` | `25` (must be in `pageSizeOptions`, default `[10, 25, 50, 100]`) |
| `selection` | `RowId[]` | `[]` |
| `columnState` | `ColumnStateItem[]` — `{ id, width?, hidden?, pinned?, order }` | from column defs |

### 6.1 State transitions

```text
Sort toggle (single-sort):   none ──click──▶ asc ──click──▶ desc ──click──▶ none
Sort toggle (multi, Shift):  appends / cycles that column only; other sort items keep their order
Search typed:                debounce 200 ms ─▶ search updated ─▶ page = 0
Filter added/changed/removed:                  ─▶ page = 0
Page size changed:           page = floor(firstVisibleIndex / newPageSize)
Data replaced / filter narrowed:  page = clamp(page, 0, max(0, pageCount - 1))
Data replaced:               selection = selection ∩ ids(newRows)   (notify host if changed)
View switched:               nothing else changes (FR-012)
Hide column:                 rejected if it would leave 0 visible columns (US7 scenario 2)
```

### 6.2 Invariants

- `0 ≤ page < max(1, pageCount)` at all times.
- In `selectionMode='single'`, `selection.length ≤ 1`.
- No id in `selection` refers to a non-selectable row (`isRowSelectable(row) === false`).
- At least one column is visible.

## 7. Filter Condition

| Attribute | Type | Rules |
|---|---|---|
| `columnId` | `string` | Must refer to a `filterable` column. Otherwise it is ignored. |
| `operator` | see table below | Must be valid for the column type. |
| `value` | `unknown` | Required unless the operator is `isEmpty` / `isNotEmpty`. |
| `value2` | `unknown` | Required for `between` (inclusive on both ends). |

| Column type | Operators |
|---|---|
| text / enum | `contains`, `equals`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`, `in` (enum) |
| number / currency / percent | `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `between`, `isEmpty`, `isNotEmpty` |
| date | `before`, `after`, `on`, `between`, `isEmpty`, `isNotEmpty` |
| boolean | `isTrue`, `isFalse`, `isEmpty` |

All conditions are combined with **AND**, and then AND-ed with search (US3 scenario 6). Text operators are case- and accent-insensitive.

## 8. Selection

| Attribute | Type | Default |
|---|---|---|
| `selectionMode` | `'none' \| 'single' \| 'multi'` | `'none'` |
| `selection` | `RowId[]` | `[]` |
| `isRowSelectable` | `(row) => boolean` | all selectable |
| anchor (internal) | `RowId \| null` | for Shift+click ranges |

"Select all" = every selectable row in the current **filtered + searched** result, across all pages (US5 scenario 2). In host-managed mode, "select all" covers only the loaded rows, and the header shows "All N on this page selected".

## 9. Data Request (host-managed mode)

```text
DataRequest {
  requestId: number       // increases monotonically per component instance
  page: number            // 0-based
  pageSize: number
  sort: SortItem[]
  filters: FilterCondition[]
  search: string
}
DataPage { rows: Row[]; totalCount: number }
```

Lifecycle: `idle → loading → (success → idle) | (error → error)`. From `error`, **Retry** re-issues the same request with a new `requestId`. A response is applied only when its `requestId` equals the latest issued id (FR-025).

## 10. Theme and Locale

| Entity | Attributes |
|---|---|
| **Theme** | `colorScheme: 'light' \| 'dark' \| 'auto'` (default `auto`), `density: 'compact' \| 'standard' \| 'comfortable'` (row height 32 / 40 / 52 px), `tokens: Partial<Record<ThemeToken, string>>` mapped to `--aits-*` CSS properties |
| **Locale settings** | `locale: string` (default = the browser's `navigator.language`; on the server, `'en-US'`), `direction: 'ltr' \| 'rtl' \| 'auto'` (default `auto` = inherited), `messages: Partial<Messages>` (all built-in strings, see contract §Messages) |

## 11. Persisted Preferences

`localStorage["@atharvaits/react-data-grid:" + persistStateKey]`:

```json
{ "v": 1, "view": "grid", "sort": [{ "columnId": "salary", "direction": "desc" }],
  "pageSize": 50, "columns": [{ "id": "name", "width": 220, "hidden": false, "pinned": "start", "order": 0 }] }
```

- Unknown `v` → discard the whole entry.
- Column ids not present in the current columns → ignore those items (US7 scenario 5).
- `view` not in the allowed `views` → ignore it.
- Selection, search, filters, and page are **not** persisted (they are session-specific).

## 12. Playground entities

| Entity | Attributes |
|---|---|
| **Sample Dataset** (`sample-50`) | 50 employee records, fixed order and content. Fields: `id` (string, unique `EMP-001`…`EMP-050`), `name`, `email`, `avatar` (SVG data URI), `department` (enum: 6 values), `role`, `salary` (number, currency USD), `bonusPct` (number, percent), `active` (boolean), `startDate` (Date), `rating` (number 1–5 with one `null`), `address` (`{ city, country }`), `bio` (text; includes 1 very long value, 1 empty, 2 accented/non-Latin names, and 1 markup-like string `"<b>bold</b> & <script>"`). |
| **Playground Scenario** | `{ id, label, rows \| fetchData, suggestedProps }`. Ids: `default-50`, `empty`, `null-data`, `invalid-items`, `edge-cases`, `wide-120-cols`, `large-100k`, `server-mode`. |
| **Playground Settings** | Mirrors every public prop (except data). Kept in memory. Reset on page reload (US9 scenario 5). |
| **Event Log Entry** | `{ time, eventName, payloadSummary }`, capped at the most recent 200 entries. |
