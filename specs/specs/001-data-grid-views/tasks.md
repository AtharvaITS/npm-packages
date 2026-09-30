---

description: "Task list for ReactDataGrid — Multi-View Data Display Component"
---

# Tasks: ReactDataGrid — Multi-View Data Display Component

**Input**: Design documents from `specs/001-data-grid-views/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/component-api.md, contracts/playground.md, quickstart.md

**Tests**: INCLUDED. The spec requires automated tests. SC-005 requires that "100% of the edge cases … are covered by automated tests", and SC-006 requires automated accessibility checks. Within each story, write the test tasks first and confirm they fail before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1…US9)

## Path Conventions

- **All paths are relative to the `React-Grid/` folder**, which is the parent of the Spec Kit workspace `React-Grid/specs/`. Do **not** create source files inside `specs/`.
- Package: `packages/react-data-grid/` · Playground: `apps/playground/`
- Contracts referenced below: `specs/specs/001-data-grid-views/contracts/component-api.md` (the "API contract") and `specs/specs/001-data-grid-views/contracts/playground.md` (the "Playground contract"). Data rules: `specs/specs/001-data-grid-views/data-model.md` (the "data model").

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, tooling, and build configuration

- [X] T001 Create root `package.json` in `React-Grid/package.json`: `"private": true`, `"workspaces": ["packages/*", "apps/*"]`, `"engines": { "node": ">=20" }`, and scripts `dev` (`npm run dev -w apps/playground`), `build` (`npm run build -w packages/react-data-grid`), `build:playground`, `test` (`npm test -w packages/react-data-grid`), `test:e2e` (`npm run test:e2e -w apps/playground`), `lint` (`eslint . && prettier --check .`), `typecheck` (`tsc -b`), `size` (`npm run size -w packages/react-data-grid`). Add devDependencies `typescript@^5`, `eslint@^9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `prettier`, `@changesets/cli`
- [X] T002 Create `React-Grid/tsconfig.base.json` with `strict: true`, `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: false`, `skipLibCheck: true`, and a root `React-Grid/tsconfig.json` with project references to both workspaces
- [X] T003 [P] Create `React-Grid/eslint.config.js` (flat config) with typescript-eslint, react-hooks, and jsx-a11y recommended rules. Add a `no-restricted-imports` rule scoped to `apps/playground/**` that forbids any import matching `**/packages/**` or `@atharvaits/react-data-grid/src/**` (Playground contract §2.2, FR-048). Ignore `**/dist/**` and `specs/**`
- [X] T004 [P] Create `React-Grid/.prettierrc` (`singleQuote: true`, `printWidth: 100`), `React-Grid/.prettierignore` (dist, specs, coverage), and `React-Grid/.editorconfig`
- [X] T005 [P] Create `React-Grid/.gitignore` (node_modules, dist, coverage, playwright-report, test-results, .vite) and `React-Grid/LICENSE` (MIT, current year)
- [X] T006 Create `packages/react-data-grid/package.json`:
  - identity: `name: "@atharvaits/react-data-grid"`, `version: "0.0.0"`, `type: "module"`, `license: "MIT"`
  - `exports`: `"."` → `{ types: "./dist/index.d.ts", import: "./dist/index.js", require: "./dist/index.cjs" }`, `"./styles.css"` → `"./dist/styles.css"`, `"./package.json"`
  - `main`, `module`, `types`, `files: ["dist"]`, `sideEffects: ["*.css"]`
  - `peerDependencies: { react: ">=18.0.0", "react-dom": ">=18.0.0" }`, and **no** `dependencies` field
  - devDependencies: react, react-dom, @types/react, @types/react-dom, tsup, vitest, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, vitest-axe, size-limit, @size-limit/preset-small-lib
  - scripts: `build`, `test` (`vitest run`), `test:watch`, `size`, `typecheck`
- [X] T007 Create `packages/react-data-grid/tsconfig.json` (extends base, `include: ["src", "tests"]`) and `packages/react-data-grid/tsup.config.ts`: entry `src/index.ts`, formats `esm` + `cjs`, `dts: true`, `sourcemap: true`, `clean: true`, `external: ["react", "react-dom", "react/jsx-runtime"]`, target `es2020`. Add an `onSuccess` step that concatenates `src/styles/tokens.css` + `src/styles/grid.css` into `dist/styles.css`
- [X] T008 [P] Create `packages/react-data-grid/vitest.config.ts` (environment `jsdom`, `setupFiles: ["tests/setup.ts"]`, coverage v8 over `src/**`). Add a separate project `ssr` for `tests/ssr/**` with environment `node`. Create `packages/react-data-grid/tests/setup.ts` that registers `@testing-library/jest-dom/vitest` and `vitest-axe/extend-expect`, and stubs `ResizeObserver` and `matchMedia`
- [X] T009 [P] Create `packages/react-data-grid/.size-limit.json` with one entry covering `dist/index.js` + `dist/styles.css`, `limit: "60 KB"`, gzip (SC-008)
- [X] T010 Create `apps/playground/package.json` (`private: true`, `type: "module"`, dependencies `react@^19`, `react-dom@^19`, `"@atharvaits/react-data-grid": "*"`; devDependencies `vite@^7`, `@vitejs/plugin-react`, `@playwright/test`, `@axe-core/playwright`; scripts `dev` (`vite`), `build` (`vite build`), `preview`, `test:e2e` (`playwright test`)), plus `apps/playground/tsconfig.json` and `apps/playground/index.html`
- [X] T011 Create `apps/playground/vite.config.ts`:
  - `server: { host: "localhost", port: 5173, strictPort: true, open: true }`
  - `resolve.alias`, **with the more specific key listed first**: `@atharvaits/react-data-grid/styles.css` → `../../packages/react-data-grid/src/styles/index.css`, then `@atharvaits/react-data-grid` → `../../packages/react-data-grid/src/index.ts`
- [X] T012 [P] Create `apps/playground/playwright.config.ts`: `webServer` running `npm run dev` on port 5173 with `reuseExistingServer: true`, projects chromium/firefox/webkit plus a `mobile` project (viewport 360×740), `testDir: "e2e"`
- [X] T013 [P] Create `React-Grid/.changeset/config.json` (`baseBranch: "main"`, `access: "public"`) and `React-Grid/.github/workflows/ci.yml` running on Node 20 and 24: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → `npm run size` → `npx playwright install --with-deps` → `npm run test:e2e`
- [X] T014 Run `npm install` at `React-Grid/`, then confirm that `node_modules/@atharvaits/react-data-grid` is a symlink to `packages/react-data-grid` and that `npm run lint` runs with no config errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Public types, pure data core, state primitives, base styles, and the Playground shell. Every story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T015 Create `packages/react-data-grid/src/types.ts` with **every** public type from API contract §2–§6: `ReactDataGridProps<TRow>` (all props in §3.1–§3.7, all optional), `ColumnDef<TRow>`, `ColumnType`, `CellContext`, `CardContext`, `ListItemContext`, `ViewType = 'table' | 'grid' | 'list'`, `SortItem`, `SortDirection`, `FilterCondition`, `FilterOperator` (the full operator list from data model §7), `SelectionMode`, `RowId = string`, `GridState`, `ColumnStateItem`, `DataRequest`, `DataPage`, `FetchDataOptions`, `Theme`, `ThemeToken` (the 19 tokens in API contract §7), `Density`, `ColorScheme`, `Messages`
- [X] T016 [P] Create `packages/react-data-grid/src/dev/warn.ts`: `warn(instanceKey: object, message: string)`. It prints `console.warn("[ReactDataGrid] " + message)` only when `process.env.NODE_ENV !== 'production'`, and deduplicates per instance+message using a `WeakMap<object, Set<string>>` (research R12)
- [X] T017 [P] Create `packages/react-data-grid/src/i18n/messages.ts` exporting `defaultMessages: Messages` with the exact English defaults from API contract §6 (e.g. `empty: "No data to display"`, `noResults: "No matching results"`, `pageRange: (f, t, n) => \`${f}–${t} of ${n}\``), and `mergeMessages(partial)`
- [X] T018 [P] Create `packages/react-data-grid/src/core/normalize.ts` implementing data model §1–§3:
  - `normalizeData(input, warnKey)`: `null`/`undefined` → `[]`; non-array → `[]` + warning `"data must be an array"`; drop items that are not plain objects (or are arrays) + one warning `"Skipped N invalid rows at indexes …"`. Returns `{ rows, sourceIndexes }` without mutating the input
  - `getValue(row, path)`: if `path` is an own key, use it directly; else split on `.`; safe on missing segments
  - `resolveRowIds(rows, getRowId, warnKey)`: returns `string[]`. With no `getRowId`, use `String(sourceIndex)`. If any id is missing or duplicated, fall back to index ids for the **whole** data set and warn once, listing the conflicting ids
- [X] T019 [P] Create `packages/react-data-grid/src/core/columns.ts` implementing data model §4:
  - `humanizeHeader(field)`: `firstName` → "First Name", `snake_case` → "Snake Case", `address.city` → "Address City"
  - `deriveColumns(rows)`: the union of top-level keys in first-seen order
  - `inferType(values)`: sample the first 100 non-empty values; all number → `number`, all boolean → `boolean`, all Date → `date`, else `text`; **strings are never inferred as number/date**
  - `resolveColumns(defs | undefined, rows, warnKey)`: apply the defaults table in data model §4 (`minWidth 60`, `maxWidth 800`, `align end` for number/currency/percent, all capability flags `true`), clamp `minWidth ≤ width ≤ maxWidth`, dedupe ids with a `__2` suffix + warning, and auto-collect `enumValues` when there are ≤ 20 distinct values
- [X] T020 [P] Create `packages/react-data-grid/src/core/format.ts`: `formatValue(value, column, locale)` implementing every row of the display table in data model §4.2 exactly. Use cached `Intl.NumberFormat` and `Intl.DateTimeFormat` instances keyed by locale+options; currency/percent come from `formatOptions`; `NaN`/`±Infinity`/invalid Date → `"—"`; arrays → first 3 items joined with `", "` plus `" +N"`; plain objects → key summary like `{city, zip, +1}`; circular references → `"[Circular]"`; function/symbol → `""` + one warning per column. Returns a string (never HTML)
- [X] T021 Create `packages/react-data-grid/src/state/useControllableState.ts`: `useControllableState<T>({ value, defaultValue, onChange })` returning `[current, setValue]`. It is controlled when `value !== undefined`, and `onChange` fires on every requested change in both modes (research R9)
- [X] T022 Create `packages/react-data-grid/src/state/useGridState.ts`: holds `view`, `sort`, `filters`, `search`, `page`, `pageSize`, `selection`, and `columnState` via `useControllableState` (initial values from data model §6). It exposes typed setters and calls `onStateChange(state, changedKey)`. Leave the transition rules as TODOs to be filled in by later stories
- [X] T023 Create `packages/react-data-grid/src/state/GridContext.ts` (React context carrying resolved props, columns, messages, locale, state and setters, and `warnKey`) and `packages/react-data-grid/src/state/useIsomorphicLayoutEffect.ts` (`useLayoutEffect` in the browser, `useEffect` on the server)
- [X] T024 [P] Create `packages/react-data-grid/src/styles/tokens.css`: every token from API contract §7 as `--aits-*` custom properties on `.aits-root`, with light defaults, dark overrides under `.aits-root[data-color-scheme="dark"]`, and under `@media (prefers-color-scheme: dark)` for `.aits-root[data-color-scheme="auto"]`. Include density row heights `compact 32px` / `standard 40px` / `comfortable 52px` via `[data-density]`. All text/background pairs must reach at least 4.5:1 contrast
- [X] T025 [P] Create `packages/react-data-grid/src/styles/grid.css` with everything inside `@layer aits { … }`: `.aits-root` base (box-sizing, font, color, background), `:focus-visible` ring using `--aits-color-focus-ring` (≥ 3:1), and logical properties only (`padding-inline`, `inset-inline-start`, …) for RTL. Also create `packages/react-data-grid/src/styles/index.css` that `@import`s tokens.css and grid.css
- [X] T026 Create `packages/react-data-grid/src/ReactDataGrid.tsx` as a skeleton: normalize data → resolve row ids → resolve columns (memoized) → create state → provide `GridContext` → render `<div className="aits-root" data-view data-density data-color-scheme dir>` containing an empty `.aits-body`. Create `packages/react-data-grid/src/index.ts` exporting `ReactDataGrid`, `createColumns` (identity function), `defaultMessages`, and all public types from `types.ts`, and nothing else
- [X] T027 [P] Write `packages/react-data-grid/tests/unit/normalize.test.ts` covering every "Input data" edge case in spec.md for normalize: null/undefined/object/string/number input, a mix of invalid items, keys containing dots, nested paths, missing ids, duplicate ids → index fallback + one warning, input array not mutated (`Object.freeze` the fixtures)
- [X] T028 [P] Write `packages/react-data-grid/tests/unit/columns.test.ts`: humanizing, union ordering, inconsistent keys, type inference including "strings like '42' stay text", duplicate ids, width clamping, enum auto-collection threshold (20 vs 21 distinct values), 120 fields
- [X] T029 [P] Write `packages/react-data-grid/tests/unit/format.test.ts`: every row of the data model §4.2 table, including a circular object, `NaN`, `Infinity`, an invalid Date, bigint, a 5-item array, and markup strings returned unchanged as plain text
- [X] T030 [P] Write `packages/react-data-grid/tests/unit/useControllableState.test.tsx`: uncontrolled default, controlled value ignores internal set but fires onChange, switching modes
- [X] T031 [P] Create `apps/playground/src/data/sample-50.ts` exporting `sample50: readonly Employee[]`: exactly 50 **hand-written literal** records (no random generation) matching data model §12:
  - ids `EMP-001`…`EMP-050` in order
  - fields `name`, `email`, `avatar` (inline SVG data URI of initials on a colored circle), `department` (exactly 6 distinct values), `role`, `salary` (number), `bonusPct` (number 0–0.3), `active` (boolean), `startDate` (`new Date("YYYY-MM-DD")`), `rating` (1–5, exactly one `null`), `address: { city, country }`, `bio`
  - `bio` must include 1 value over 500 characters, 1 empty string, and the exact markup-like value `"<b>bold</b> & <script>"`; at least 2 `name` values must be accented or non-Latin (e.g. "José Álvarez", "李 娜")
  - export the `Employee` type
- [X] T032 Create `apps/playground/src/main.tsx` and `apps/playground/src/App.tsx` rendering `<ReactDataGrid data={sample50} getRowId="id" />`, importing only from `@atharvaits/react-data-grid` and `@atharvaits/react-data-grid/styles.css`. Create `apps/playground/src/app.css` with a basic page layout. Verify `npm run dev` opens `http://localhost:5173`

**Checkpoint**: Foundation ready. `npm test` passes the unit tests and the Playground opens (rendering an empty root).

---

## Phase 3: User Story 1 - Render supplied data with zero configuration (Priority: P1) 🎯 MVP

**Goal**: Passing only `data` renders a readable, safe table.

**Independent Test**: Render `<ReactDataGrid data={twenty} />` in a blank app and confirm 20 rows, humanized headers, blank cells for missing values, an empty-state message for `[]`, updates when new data is supplied, and markup shown as text.

### Tests for User Story 1

- [X] T033 [P] [US1] Write `packages/react-data-grid/tests/component/table-basic.test.tsx` covering US1 acceptance scenarios 1–5:
  - 20 rows + humanized headers
  - union of keys with blank missing cells (no "undefined"/"null" text)
  - `[]` → "No data to display"
  - `rerender` with new data updates rows
  - `<script>alert(1)</script>` appears as text and no `script` element exists
- [X] T034 [P] [US1] Write `packages/react-data-grid/tests/ssr/render-to-string.test.tsx` (node environment): `renderToString(<ReactDataGrid data={rows} />)` does not throw, touches no `window`/`document`, and the output contains the header text and first row values (FR-045)

### Implementation for User Story 1

- [X] T035 [P] [US1] Create `packages/react-data-grid/src/views/table/Cell.tsx`: renders a column's display value for a row via `formatValue` as a React text node inside `<div className="aits-cell" role="gridcell" title={fullText}>`, with CSS truncation. Booleans render ✓/✗ with visually hidden `messages.yes`/`messages.no` text
- [X] T036 [P] [US1] Create `packages/react-data-grid/src/views/table/HeaderCell.tsx`: renders `column.header` in `<div className="aits-header-cell" role="columnheader">`, with alignment from `column.align`
- [X] T037 [US1] Create `packages/react-data-grid/src/views/table/Row.tsx` (`.aits-row`, `role="row"`, one `Cell` per visible column) and `packages/react-data-grid/src/views/table/TableView.tsx`: `.aits-table` wrapper with horizontal scroll (`overflow-x: auto`), a header row, and body rows for the rows it receives. Use CSS grid with column widths from resolved columns (`auto` → `minmax(minWidth, 1fr)`)
- [X] T038 [P] [US1] Create `packages/react-data-grid/src/states/EmptyState.tsx`: `.aits-empty` showing `emptyContent` (ReactNode or function) or `messages.empty`
- [X] T039 [US1] Wire US1 into `packages/react-data-grid/src/ReactDataGrid.tsx`: when there are no rows render `EmptyState`, otherwise `TableView`. Rows, ids, and columns are recomputed only when `data`/`columns`/`getRowId` identity changes, so re-supplying the same array causes no re-layout
- [X] T040 [P] [US1] Add table styles to `packages/react-data-grid/src/styles/grid.css`: `.aits-table`, `.aits-header-cell` (sticky top), `.aits-row`, `.aits-cell` (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: var(--aits-row-height)`), zebra rows using `--aits-color-surface-alt`, `.aits-empty`
- [X] T041 [US1] Write the Quick Start section of `packages/react-data-grid/README.md`: install, `import '@atharvaits/react-data-grid/styles.css'`, the minimal `<ReactDataGrid data={…} />` example, and the peer requirement React ≥ 18

**Checkpoint**: The MVP works. The Playground shows the 50 sample records in a table.

---

## Phase 4: User Story 2 - Switch between table, grid, and list views (Priority: P1)

**Goal**: The same records render as table, cards, or list items, with a switcher and state kept across views.

**Independent Test**: Switch across all three views in the Playground. Records are identical in each, and view restrictions, default view, and controlled mode work.

### Tests for User Story 2

- [X] T042 [P] [US2] Write `packages/react-data-grid/tests/component/views.test.tsx` covering US2 scenarios 1, 2, 4, 5, 6, 7:
  - grid shows cards with the title + labelled fields
  - list shows primary/secondary lines
  - `views={['table','list']}` → 2 switcher options; `views={['grid']}` → no switcher
  - `defaultView="grid"`
  - controlled `view` + `onViewChange` only changes when the prop changes
  - no `titleField` → first visible column is the title
  - `view` not in `views` → falls back to the first allowed view + warning

### Implementation for User Story 2

- [X] T043 [US2] Implement view resolution in `packages/react-data-grid/src/state/useGridState.ts`: `views` empty → all three; invalid `view`/`defaultView` → first allowed + warning; `showViewSwitcher` is effectively false when `views.length === 1`. **Switching view changes nothing else** (data model §6.1)
- [X] T044 [P] [US2] Create `packages/react-data-grid/src/virtual/useElementSize.ts`: returns `{ width, height }` of a ref via `ResizeObserver`. Returns `{ width: 0, height: 0 }` on the server and does not create an observer when `ResizeObserver` is undefined
- [X] T045 [P] [US2] Create `packages/react-data-grid/src/toolbar/ViewSwitcher.tsx`: a segmented control of `role="radiogroup"` with `aria-label={messages.viewSwitcherLabel}` and one `role="radio"` button per allowed view (icon + `messages.viewTable|viewGrid|viewList`); arrow keys move between options
- [X] T046 [P] [US2] Create `packages/react-data-grid/src/toolbar/Toolbar.tsx` (`.aits-toolbar`, flex-wrapping container) rendering `ViewSwitcher` when enabled, with slots for search, filter, and selection added by later stories
- [X] T047 [P] [US2] Create `packages/react-data-grid/src/views/grid/Card.tsx`:
  - `.aits-card` with an optional image (`imageField`, an `<img alt="">` with `loading="lazy"`)
  - the title (`titleField`, default the first visible column)
  - up to `cardFieldLimit` (default 6) remaining visible fields as `<dl>` label/value pairs using `formatValue`
- [X] T048 [US2] Create `packages/react-data-grid/src/views/grid/GridView.tsx`: `.aits-grid` with column count `max(1, floor(width / cardMinWidth))` (default `cardMinWidth` 240) from `useElementSize`, using the CSS grid `repeat(n, 1fr)`; default image field = first `image`-typed column
- [X] T049 [P] [US2] Create `packages/react-data-grid/src/views/list/ListItem.tsx` (`.aits-list-item`: optional leading image, primary line = `titleField`, secondary line = `subtitleField` default second visible column, then remaining fields up to `cardFieldLimit` inline and muted) and `packages/react-data-grid/src/views/list/ListView.tsx` (`.aits-list`)
- [X] T050 [US2] Update `packages/react-data-grid/src/ReactDataGrid.tsx` to render `Toolbar` and pick `TableView` / `GridView` / `ListView` from `state.view`, passing the **same** processed rows to each. Set `data-view` on `.aits-root`
- [X] T051 [P] [US2] Add grid and list styles to `packages/react-data-grid/src/styles/grid.css`: `.aits-toolbar`, `.aits-view-switcher`, `.aits-grid` (gap `--aits-card-gap`), `.aits-card` (surface, border, radius, shadow, fixed height for later virtualization), `.aits-list`, `.aits-list-item`, with long text truncated
- [X] T052 [US2] Add a "Views" section to `packages/react-data-grid/README.md` documenting `view`/`defaultView`/`onViewChange`, `views`, `showViewSwitcher`, `titleField`, `subtitleField`, `imageField`, `cardMinWidth`, and `cardFieldLimit`, with one example each

**Checkpoint**: All three views work with the sample data.

---

## Phase 5: User Story 9 - Preview every change in a Playground with fixed sample data (Priority: P1)

**Goal**: A local Playground that always opens with the same 50 records and has scenarios, a settings panel, and an event log. Later stories add their own controls to it.

**Independent Test**: `npm run dev` shows the 50 records. Reload shows the same order. Scenario switching and Reset work. Editing a package message shows in the browser within 3 s.

### Tests for User Story 9

- [X] T053 [P] [US9] Write `apps/playground/e2e/playground.spec.ts`:
  - on load the table shows `EMP-001` first and 50 records total (page through if paged)
  - after `page.reload()` the first 5 names are identical
  - picking scenario `empty` shows "No data to display"
  - **Reset** returns to `default-50`
  - the event log shows `onViewChange` after switching view
- [X] T054 [P] [US9] Write `apps/playground/src/data/sample-50.test.ts` (run via the package's Vitest with an `include` glob, or a small `vitest.config.ts` in apps/playground) asserting: length 50, ids `EMP-001`…`EMP-050` in order and unique, 6 distinct departments, exactly one `rating === null`, a bio over 500 characters exists, the markup bio exists, at least 2 non-ASCII names (FR-049, FR-050)

### Implementation for User Story 9

- [X] T055 [P] [US9] Create `apps/playground/src/data/generate.ts`: a `mulberry32(seed)` PRNG; `generateEmployees(count, seed = 20260925)` producing records shaped like `Employee` with deterministic values; `generateWide(rows = 30, cols = 120)` producing `field001`…`field120` of mixed types
- [X] T056 [P] [US9] Create `apps/playground/src/data/edge-cases.ts` exporting:
  - `invalidItems` (a mix of valid rows, `null`, `42`, `"str"`, `[1,2]`)
  - `edgeCaseRows`: inconsistent keys, a nested object, an object with a circular self-reference, `NaN`, `Infinity`, `-Infinity`, a bigint, a 10,000-character unbroken string, `"<img src=x onerror=alert(1)>"`, a function value, two rows sharing the same `id`, and keys with spaces, dots, and non-Latin characters
- [X] T057 [US9] Create `apps/playground/src/data/scenarios.ts` exporting `scenarios: Scenario[]` with ids `default-50`, `empty`, `null-data`, `invalid-items`, `edge-cases`, `wide-120-cols`, `large-100k` (lazily generated on first selection and memoized), each `{ id, label, data, suggestedProps }`. `server-mode` is added in US4. Default = `default-50`
- [X] T058 [P] [US9] Create `apps/playground/src/events/EventLog.tsx` and `apps/playground/src/events/useEventLog.ts`:
  - `log(eventName, payload)` prepends `{ time: HH:MM:SS, eventName, payloadSummary }`, where `payloadSummary` is `JSON.stringify` truncated to 200 characters with circular references handled
  - capped at **200** entries
  - a Clear button
- [X] T059 [US9] Create `apps/playground/src/settings/SettingsPanel.tsx` and `apps/playground/src/settings/useSettings.ts`:
  - settings kept in memory only (**not** persisted), so reload resets them (US9 scenario 5)
  - a collapsible section per group: View, Data, Sort, Filter, Paging, Selection, Columns, Theme, Locale, Persistence
  - build the **View** group now: `defaultView`, allowed `views` (checkboxes), `showViewSwitcher`, `titleField`/`subtitleField`/`imageField` (selects of column ids), `cardMinWidth`, `cardFieldLimit`
  - later stories add their controls to the other groups
- [X] T060 [US9] Update `apps/playground/src/App.tsx` to the layout in Playground contract §3:
  - a header with a scenario `<select>` + **Reset** button (restores `default-50` and default settings)
  - `<ReactDataGrid>` fed by the current scenario's data plus settings spread as props, with every `on*` callback wired to `log()`
  - `SettingsPanel` on the right and `EventLog` below
  - Add to `apps/playground/src/app.css`: stack the layout vertically below 900px
- [X] T061 [US9] Add a "Playground" section to `React-Grid/README.md` (create the file: project overview, `npm install`, `npm run dev`, available scenarios, and the note "local only — not deployed" per FR-055) and verify hot reload manually: edit `defaultMessages.empty` → the browser updates within 3 s

**Checkpoint**: The Playground is the working preview harness for all remaining stories.

---

## Phase 6: User Story 8 - Accessible and responsive use (Priority: P2)

**Goal**: Keyboard-only, screen-reader, 360px, 200% zoom, and RTL use all work across the three views.

**Independent Test**: With keyboard and screen reader only, switch views, move between cells/cards/items, and hear positions announced. At 360px width there is no page-level horizontal overflow. RTL mirrors correctly. axe reports zero violations.

### Tests for User Story 8

- [X] T062 [P] [US8] Write `packages/react-data-grid/tests/component/keyboard.test.tsx`:
  - Tab enters the table on the first cell (a single tab stop)
  - Arrow Up/Down/Left/Right, Home/End, Ctrl+Home/Ctrl+End, and PageUp/PageDown move `aria-activedescendant` or focus correctly
  - grid view: arrows move in 2D across cards
  - list view: Up/Down
  - the view switcher can be operated with arrows
- [X] T063 [P] [US8] Write `packages/react-data-grid/tests/component/a11y.test.tsx`: `axe(container)` has no violations for table/grid/list × light/dark × empty/non-empty. Also assert `role="grid"`, `aria-rowcount`, `aria-colcount`, `aria-rowindex`, and `aria-colindex` values
- [X] T064 [P] [US8] Write `apps/playground/e2e/a11y-responsive.spec.ts`:
  - `@axe-core/playwright` WCAG 2.2 AA scan of each view in light and dark: zero violations
  - `mobile` project (360px): `document.documentElement.scrollWidth <= 360`, the grid view has 1 card column, the toolbar is visible
  - `page.setViewportSize` + CSS zoom 200%: controls are still usable
  - direction=rtl: the first column sits at the right edge

### Implementation for User Story 8

- [X] T065 [P] [US8] Create `packages/react-data-grid/src/a11y/useRovingFocus.ts`: a generic 2D roving-tabindex hook (`rowCount`, `colCount`, `getCellId`, `onActivate`) supporting Arrow keys, Home/End, Ctrl+Home/End, PageUp/PageDown (moving by visible page size), and RTL-aware Left/Right swapping. Exactly one element has `tabIndex=0`
- [X] T066 [P] [US8] Create `packages/react-data-grid/src/a11y/LiveRegion.tsx`: a visually hidden `aria-live="polite"` `aria-atomic="true"` region with an `announce(text)` function exposed through `GridContext`. It debounces by 150 ms so rapid changes produce one announcement
- [X] T067 [US8] Apply the ARIA grid pattern in `packages/react-data-grid/src/views/table/TableView.tsx`, `Row.tsx`, `Cell.tsx`, `HeaderCell.tsx`:
  - `role="grid"` with `aria-rowcount={total + 1}`, `aria-colcount`, `aria-label` (or `aria-labelledby` from props)
  - `aria-rowindex` on rows (1-based, header = 1) and `aria-colindex` on cells, using **absolute** positions so later virtualization is announced correctly
  - wire `useRovingFocus`
- [X] T068 [US8] Apply keyboard/ARIA to `packages/react-data-grid/src/views/grid/GridView.tsx` and `Card.tsx` (`role="grid"`, one `role="row"` per visual row, each card `role="gridcell"`, 2D roving focus by column count) and to `packages/react-data-grid/src/views/list/ListView.tsx`/`ListItem.tsx` (`role="list"`/`listitem` with Up/Down roving focus; `listbox`/`option` is added by US5 when selection is on)
- [X] T069 [US8] Implement the `direction` prop in `packages/react-data-grid/src/ReactDataGrid.tsx`: `'ltr' | 'rtl'` sets `dir` on `.aits-root`, and `'auto'` omits it (inherited). Pass the effective direction to `useRovingFocus` (read the computed direction after mount when `'auto'`)
- [X] T070 [P] [US8] Add responsive and a11y styles to `packages/react-data-grid/src/styles/grid.css`:
  - `.aits-root { max-width: 100%; min-width: 0 }`
  - only `.aits-table` scrolls horizontally
  - the toolbar wraps below 480px
  - visible `:focus-visible` outlines on cells/cards/items/buttons
  - `.aits-visually-hidden` utility
  - `@media (forced-colors: active)` outlines
  - `rem` sizing so 200% zoom scales
- [X] T071 [US8] Add a Locale → direction control (`ltr`/`rtl`/`auto`) to `apps/playground/src/settings/SettingsPanel.tsx`, and add an "Accessibility" section to `packages/react-data-grid/README.md` listing the keyboard shortcuts

**Checkpoint**: Accessibility baseline in place. All later UI must keep T062–T064 passing.

---

## Phase 7: User Story 3 - Sort, search, and filter records (Priority: P2)

**Goal**: Stable, language-aware sorting; accent/case-insensitive search; typed per-field filters; result count; clear all.

**Independent Test**: With 500 records: sort numeric asc/desc/none with empties last, search "smith", date "between" filter, combined conditions, clear all.

### Tests for User Story 3

- [X] T072 [P] [US3] Write `packages/react-data-grid/tests/unit/sort.test.ts`:
  - asc/desc on number/text/date/boolean
  - empty values last in **both** directions
  - mixed types ordered number < text < empty
  - stability (equal keys keep original order)
  - natural order `item2` < `item10`
  - `éclair` next to `eclair`
  - multi-sort primary+secondary
  - custom `compare`
  - input array not mutated
- [X] T073 [P] [US3] Write `packages/react-data-grid/tests/unit/search.test.ts` (case- and accent-insensitive: "jose" matches "José"; only visible `searchable` columns; formatted values not used unless configured; empty query → all) and `packages/react-data-grid/tests/unit/filter.test.ts` (every operator in data model §7 per type; `between` inclusive on both ends; AND combination; conditions on non-filterable or unknown columns ignored; empty-value operators)
- [X] T074 [P] [US3] Write `packages/react-data-grid/tests/component/sort-search-filter.test.tsx` covering US3 scenarios 1–8:
  - clicking a header cycles asc → desc → none with correct `aria-sort`
  - search debounce 200 ms (fake timers) then the result count shows
  - date between filter
  - clear all
  - `multiSort` with Shift+click
  - `sortable: false` / `filterable: false` columns show no controls
  - search/filter resets page to 0
  - the live region announces "N results"

### Implementation for User Story 3

- [X] T075 [P] [US3] Create `packages/react-data-grid/src/core/sort.ts`: `sortIndexes(rows, indexes, sortItems, columns, locale)`. It precomputes `[key, originalIndex]` per active sort column using `getValue`/`valueGetter` raw values, uses a cached `Intl.Collator(locale, { numeric: true, sensitivity: 'base' })` for text, places empty (`null`/`undefined`/`''`/NaN) **last regardless of direction**, orders mixed types number < text < empty, is stable, supports custom `compare`, and returns a new index array
- [X] T076 [P] [US3] Create `packages/react-data-grid/src/core/search.ts`: `fold(s)` = `s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()`; `buildSearchText(row, searchableColumns)` cached in a `WeakMap<row, Map<columnsKey, string>>`; `searchIndexes(rows, indexes, query, columns)`
- [X] T077 [P] [US3] Create `packages/react-data-grid/src/core/filter.ts`: `filterIndexes(rows, indexes, conditions, columns, locale)` implementing the operator table in data model §7 exactly. Text operators use `fold()`; `between` is inclusive; date comparisons use `getTime()` and accept Date or ISO strings when the column type is `date`; all conditions are AND-ed; invalid conditions are skipped
- [X] T078 [US3] Create `packages/react-data-grid/src/core/pipeline.ts`: `runPipeline({ rows, columns, search, filters, sort, locale }) → { indexes: number[], matchCount }` in the order search → filter → sort. Use it in `ReactDataGrid.tsx` via `useMemo`, wrapping search/filter state updates in `startTransition`
- [X] T079 [US3] Add the transitions to `packages/react-data-grid/src/state/useGridState.ts`: the sort toggle cycle `none → asc → desc → none`; with `multiSort` and Shift, append/cycle only that column; search/filter changes set `page = 0` (data model §6.1). After each pipeline result change, call `announce(messages.resultsCount(n))`
- [X] T080 [P] [US3] Update `packages/react-data-grid/src/views/table/HeaderCell.tsx`: when `column.sortable`, render a button with a sort icon and `aria-sort` on the columnheader (`ascending`/`descending`/`none`). With multiSort, show a sort-priority badge. Click/Enter/Space toggles, Shift adds a secondary sort
- [X] T081 [P] [US3] Create `packages/react-data-grid/src/toolbar/SortMenu.tsx`, shown in grid and list views: a field `<select>` over sortable columns + a direction toggle, reflecting the same `sort` state
- [X] T082 [P] [US3] Create `packages/react-data-grid/src/toolbar/SearchBox.tsx`: `<input type="search">` with `aria-label={messages.searchLabel}`, a placeholder, a clear button, local input state debounced by `searchDebounceMs` (default 200) before `setSearch`. Hidden when `searchable === false`
- [X] T083 [US3] Create `packages/react-data-grid/src/toolbar/FilterPanel.tsx`:
  - a popover dialog (focus trapped, Esc closes, focus returns to the trigger) listing active conditions
  - an "Add filter" row: column select (filterable only), an operator select limited to the column type's operators from data model §7, and a value input by type (text, number, date, boolean, a multi-select for `enum`/`in`); two inputs for `between`
  - active filters shown as removable chips in the toolbar
- [X] T084 [P] [US3] Create `packages/react-data-grid/src/toolbar/ResultSummary.tsx`: when search or filters are active, show `messages.resultsCount(matchCount)` + a **Clear all** button that resets search and filters
- [X] T085 [US3] Create `packages/react-data-grid/src/states/NoResultsState.tsx` (`noResultsContent` or `messages.noResults` + a Clear filters button), shown when the data is non-empty but `matchCount === 0`, distinct from `EmptyState`. Wire SearchBox, FilterPanel, SortMenu, and ResultSummary into `Toolbar.tsx`
- [X] T086 [US3] Add Sort (`multiSort`), Filter (`filterable`, `searchable`, `searchDebounceMs`), and per-column `sortable`/`filterable`/`searchable` toggles to `apps/playground/src/settings/SettingsPanel.tsx`, log `onSortChange`/`onSearchChange`/`onFiltersChange`, and document sort, search, and filter props with examples in `packages/react-data-grid/README.md`

**Checkpoint**: Finding records works in all three views.

---

## Phase 8: User Story 4 - Handle large datasets and pagination (Priority: P2)

**Goal**: Paged or virtualized display that stays smooth at 100k rows, plus host-managed mode with loading, error, retry, and latest-request-wins.

**Independent Test**: `large-100k` scrolls smoothly and pages correctly. `server-mode` with randomized response order shows only the latest page, and failures show Retry.

### Tests for User Story 4

- [X] T087 [P] [US4] Write `packages/react-data-grid/tests/unit/paginate.test.ts`: `pageCount`, `pageSlice`, and `pageRange` text "51–75 of N"; page clamped when data shrinks (page 10 → last valid); page-size change keeps the first visible record: `page = floor(firstVisibleIndex / newPageSize)`; 0 rows → 1 page
- [X] T088 [P] [US4] Write `packages/react-data-grid/tests/unit/useVirtualRows.test.ts`: the visible range for a given scrollTop/height/rowHeight with overscan 5, total size, a range clamped at the end, and 0 rows
- [X] T089 [P] [US4] Write `packages/react-data-grid/tests/component/server-mode.test.tsx`:
  - `fetchData` is called on mount with the full `DataRequest`
  - a change of page/pageSize/sort/filter/search triggers one request
  - the previous `signal.aborted === true`
  - out-of-order resolution: only the latest request's rows are shown
  - rejection → error banner + Retry re-issues the request with a new `requestId`
  - earlier rows stay visible during the error
  - unmount during a pending request → no warnings
  - `totalCount` drives pagination
  - `onDataRequest` + `loading` + `error` host-driven form
  - a warning when both forms are supplied
- [X] T090 [P] [US4] Write `apps/playground/e2e/performance.spec.ts` (chromium):
  - `large-100k`: initial render < 1500 ms (from scenario select to first row visible)
  - scroll via `mouse.wheel` to the bottom while sampling `requestAnimationFrame` deltas: 95th percentile ≤ 20 ms, and no sample where `.aits-row` count in the viewport is 0 for > 100 ms
  - sort by name < 1500 ms; search < 1500 ms

### Implementation for User Story 4

- [X] T091 [P] [US4] Create `packages/react-data-grid/src/core/paginate.ts`: `pageCount(total, size) = max(1, ceil(total/size))`, `clampPage`, `pageSlice(indexes, page, size)`, `pageRange(page, size, total) → { from, to }` (1-based, `from = 0` when total is 0), `pageForFirstVisible(firstIndex, newSize)`
- [X] T092 [P] [US4] Create `packages/react-data-grid/src/virtual/useVirtualRows.ts`: `useVirtualRows({ count, itemSize, overscan = 5, scrollRef })` → `{ start, end, offsetTop, totalSize }`. It uses a passive scroll listener + `requestAnimationFrame` throttling and `useElementSize` for the viewport height. On the server it returns `start 0, end min(count, 50)`
- [X] T093 [US4] Create `packages/react-data-grid/src/pagination/Pagination.tsx`: `.aits-pagination` with First/Prev/Next/Last buttons (`messages.firstPage`…, disabled at the ends), `messages.pageRange(from, to, total)` text, and a page-size `<select>` over `pageSizeOptions` (default `[10, 25, 50, 100]`; warn if `pageSize` is not in the options) labelled `messages.rowsPerPage`
- [X] T094 [US4] Add the pagination transitions to `packages/react-data-grid/src/state/useGridState.ts`: clamp `page` whenever the filtered count or data changes (`0 ≤ page < max(1, pageCount)`); on a page-size change use `pageForFirstVisible`; announce the new range
- [X] T095 [US4] Apply `pagination` mode in `ReactDataGrid.tsx` and the three views:
  - `'pages'` (default) → render only `pageSlice` + `Pagination`
  - `'scroll'` → wrap the body in a scroll container of `height` (default 600, with a warning when `height` is `'auto'`) and virtualize:
    - table/list rows with `itemSize` = density row height
    - grid view virtualizes **visual rows** of cards (`count = ceil(n / columns)`, fixed card height)
  - Keep absolute `aria-rowindex` values
- [X] T096 [P] [US4] Create `packages/react-data-grid/src/states/LoadingOverlay.tsx` (a spinner + `messages.loading` over the current rows with `aria-busy="true"` on the grid; shows skeleton rows when no rows are loaded yet) and `packages/react-data-grid/src/states/ErrorState.tsx` (`.aits-error` banner with `errorContent` or `messages.error` + a Retry button; rendered **above** the still-visible previous rows)
- [X] T097 [US4] Create `packages/react-data-grid/src/state/useServerData.ts` implementing API contract §5 guarantees 1–5:
  - a monotonically increasing `requestId` per instance
  - build the `DataRequest` from state, using the debounced search
  - on change, abort the previous `AbortController` and call `fetchData(req, { signal })`
  - apply the result only if `req.requestId === latestId`
  - treat `AbortError` as silent
  - error state + `retry()`
  - abort on unmount with no state updates afterwards
  - for the `onDataRequest` form, emit the request and read `data`/`totalCount`/`loading`/`error` from props
- [X] T098 [US4] Integrate `dataMode="server"` in `ReactDataGrid.tsx`: skip the client-side pipeline (the rows are already the current page), paginate from `totalCount`, render `LoadingOverlay` and `ErrorState`, and warn when both `fetchData` and `onDataRequest` are supplied
- [X] T099 [US4] Add the `server-mode` scenario to `apps/playground/src/data/scenarios.ts`: a `fetchData` that applies search/filter/sort/paginate over `sample50` in memory (reusing the equivalent logic written locally in `apps/playground/src/data/fakeServer.ts`), with a 600 ms delay honoring `signal`, a toggle "fail every 5th request", and a toggle "randomize response order" (random delay 100–1200 ms). Add Paging controls (`pagination`, `pageSize`, `pageSizeOptions`, `height`) and the server toggles to `SettingsPanel.tsx`
- [X] T100 [US4] Document `pagination`, `page`/`pageSize` props, `height`, and server mode (both forms, with a full `fetchData` example using `signal`) in `packages/react-data-grid/README.md`

**Checkpoint**: Scale and host-managed data work.

---

## Phase 9: User Story 5 - Select records and act on them (Priority: P3)

**Goal**: None/single/multi selection with range and select-all across pages, non-selectable rows, pruning on data change, and row activation.

**Independent Test**: Multi-select across pages, select all, Shift-range, non-selectable rows skipped, and the host receives correct ids after each action and after a data change.

### Tests for User Story 5

- [X] T101 [P] [US5] Write `packages/react-data-grid/tests/unit/selection.test.ts`:
  - single mode replaces the selection
  - multi toggle
  - Shift range between the anchor and the target in the **current sorted/filtered order**
  - select all = every selectable row in the filtered result across all pages
  - non-selectable rows are skipped by toggle/range/all
  - `pruneSelection(selection, currentIds)`
  - invariant: `single` mode length ≤ 1
- [X] T102 [P] [US5] Write `packages/react-data-grid/tests/component/selection.test.tsx` covering US5 scenarios 1–6 in all three views:
  - checkbox/click/Space selects
  - the header checkbox shows the indeterminate state
  - the "N selected" bar
  - new data without selected ids → `onSelectionChange` called with the pruned ids
  - controlled `selection`
  - `onRowActivate` on click and Enter in table, grid, and list
  - server mode: select all → "All N on this page selected"

### Implementation for User Story 5

- [X] T103 [P] [US5] Create `packages/react-data-grid/src/core/selection.ts`: `toggle(selection, id, mode)`, `selectRange(orderedIds, anchor, target, isSelectable)`, `selectAll(orderedIds, isSelectable)`, `pruneSelection(selection, validIds)`, `headerState(selection, orderedSelectableIds) → 'none' | 'some' | 'all'`
- [X] T104 [US5] Add selection to `packages/react-data-grid/src/state/useGridState.ts`: the `selectionMode` default `'none'`, the anchor ref, and `onSelectionChange(ids, rows)`, where `rows` is looked up from the current data. After every data change, prune the selection and fire `onSelectionChange` only if it changed (data model §6.1)
- [X] T105 [US5] Add a selection column to the table in `packages/react-data-grid/src/views/table/TableView.tsx`/`Row.tsx`/`HeaderCell.tsx`: a pinned leading checkbox cell (`aria-label` = `messages.selectRow`/`deselectRow`), a header checkbox (select all / indeterminate; hidden in `single` mode), `aria-selected` on rows, `data-selected` for styling, a disabled checkbox when `isRowSelectable(row) === false`, and Shift+click range
- [X] T106 [US5] Add selection to `packages/react-data-grid/src/views/grid/Card.tsx` (a corner checkbox, `aria-selected`) and `packages/react-data-grid/src/views/list/ListView.tsx`/`ListItem.tsx` (switch to `role="listbox"` + `aria-multiselectable` + `role="option"` when `selectionMode !== 'none'`). Space toggles the selection in all views
- [X] T107 [P] [US5] Create `packages/react-data-grid/src/toolbar/SelectionBar.tsx`: shown when the selection is non-empty, with `messages.selectedCount(n)`, a "Select all N" button when not all are selected, and a Clear button. In server mode it shows "All N on this page selected" (data model §8)
- [X] T108 [US5] Implement `onRowActivate(row, id, event)` in all three views: a click on the row/card/item (excluding clicks on the checkbox or interactive custom content) and Enter on the focused row/card/item
- [X] T109 [US5] Add Selection controls (`selectionMode`, "make every 7th row non-selectable" toggle, controlled-selection toggle) to `apps/playground/src/settings/SettingsPanel.tsx`, log `onSelectionChange`/`onRowActivate`, and document the selection props in `packages/react-data-grid/README.md`

**Checkpoint**: Selection works in every view and data mode.

---

## Phase 10: User Story 6 - Customize columns, fields, and appearance (Priority: P3)

**Goal**: Full `ColumnDef` support, custom renderers and layouts, theme tokens, density, dark mode, messages, and locale.

**Independent Test**: Column defs hide/rename/format-currency/custom-badge apply identically in all 3 views. A theme change applies. All built-in text can be translated.

### Tests for User Story 6

- [X] T110 [P] [US6] Write `packages/react-data-grid/tests/component/customization.test.tsx` covering US6 scenarios 1–7:
  - only defined columns appear, in order, with labels, in all views
  - a currency formatter displays `$1,234.00` but sorts and filters on the raw number
  - `render` output appears in table/grid/list
  - a `valueGetter` full name is sortable and searchable
  - `renderCard`/`renderListItem` are used
  - `theme.tokens.colorAccent` sets `--aits-color-accent` on the root
  - `density="compact"` → `data-density`
  - `messages` override every built-in string (assert on none of the English defaults when a full French `Messages` is supplied)
  - `locale="de-DE"` number format
  - custom `emptyContent`/`noResultsContent`/`loadingContent`/`errorContent`
- [X] T111 [P] [US6] Write `packages/react-data-grid/tests/types/public-api.test-d.ts` using `expectTypeOf`: `createColumns<Employee>` infers row types in `valueGetter`/`render`; `getRowId` accepts keys or a function; `onSelectionChange` rows are typed `TRow[]`; unknown props are rejected

### Implementation for User Story 6

- [X] T112 [US6] Complete `ColumnDef` handling in `packages/react-data-grid/src/core/columns.ts` and `format.ts`:
  - `valueGetter` (used for display, sort, filter, and search)
  - `format(value, row)` overrides display only (FR-021)
  - `formatOptions` passed to `Intl`
  - `type: 'currency' | 'percent' | 'image' | 'enum'` default formats (currency uses `formatOptions.currency` defaulting to `'USD'`; image renders `<img alt="">` in cells at 32px)
  - `align` defaults
  - an `id` is required when there is no `field`: warn and skip the column otherwise
- [X] T113 [US6] Implement `render(ctx: CellContext)` in `Cell.tsx`, `Card.tsx`, and `ListItem.tsx`, passing `{ row, rowId, value, formattedValue, column, view, selected }`. Custom content is rendered as provided (the only path that allows markup, FR-006)
- [X] T114 [US6] Implement `renderCard(ctx: CardContext)` in `GridView.tsx` and `renderListItem(ctx: ListItemContext)` in `ListView.tsx`: the component still owns the wrapper element (roles, focus, selection attributes) and the custom content fills it. `ctx.fields` contains the visible fields with value/formattedValue/content, and `ctx.toggleSelected()` is available
- [X] T115 [P] [US6] Implement the `theme` prop in `packages/react-data-grid/src/ReactDataGrid.tsx`: map `theme.tokens` keys to inline CSS custom properties `--aits-<kebab-case>` on `.aits-root`; `data-density` from `theme.density` (default `'standard'`); `data-color-scheme` from `theme.colorScheme` (default `'auto'`); merge `className`/`style`/`id` props
- [X] T116 [P] [US6] Implement `messages` and `locale` in `ReactDataGrid.tsx`: `mergeMessages(props.messages)`. The locale defaults to `navigator.language` after mount (`'en-US'` during server rendering and on the first client render, to avoid a hydration mismatch). Pass the locale to format/sort/filter
- [X] T117 [US6] Support `emptyContent`, `noResultsContent`, `loadingContent`, and `errorContent` as `ReactNode | (ctx) => ReactNode` in `EmptyState.tsx`, `NoResultsState.tsx`, `LoadingOverlay.tsx`, `ErrorState.tsx` (ctx: `{ messages, clearFilters?, retry?, error? }`)
- [X] T118 [P] [US6] Create the Playground examples `apps/playground/src/examples/StatusBadge.tsx` (a custom `render` for `active`), `apps/playground/src/examples/EmployeeCard.tsx` (`renderCard`), `apps/playground/src/examples/EmployeeListItem.tsx` (`renderListItem`), and `apps/playground/src/examples/columns.ts` (a `createColumns<Employee>` set: salary as currency, bonusPct as percent, startDate as date, avatar as image, a `fullLocation` `valueGetter`, `address.city` path, department as enum)
- [X] T119 [US6] Add controls to `apps/playground/src/settings/SettingsPanel.tsx`:
  - Columns: "use custom column defs" toggle, "custom status badge", "custom card", and "custom list item" toggles
  - Theme: `colorScheme`, `density`, accent color picker, radius
  - Locale: `locale` select (`en-US`, `de-DE`, `fr-FR`, `ar-EG`, `ja-JP`), a "French messages" toggle backed by `apps/playground/src/examples/messages-fr.ts`
  - custom empty/error content toggles
- [X] T120 [US6] Document `columns`/`ColumnDef` (every field), `createColumns`, the render functions, `theme` and the token list, stable class names, `messages`, `locale`, and the custom state content in `packages/react-data-grid/README.md`

**Checkpoint**: The component can be fully customized.

---

## Phase 11: User Story 7 - Manage columns interactively and remember preferences (Priority: P3)

**Goal**: Resize, reorder, hide/show, and pin columns; controlled `columnState`; `persistStateKey`; aggregate `onStateChange`.

**Independent Test**: Resize, reorder, hide, and pin, then reload with persistence enabled: the layout is restored and stale fields are ignored.

### Tests for User Story 7

- [X] T121 [P] [US7] Write `packages/react-data-grid/tests/unit/persist.test.ts`:
  - it writes `{ v: 1, view, sort, pageSize, columns }` under `"@atharvaits/react-data-grid:" + key`
  - unknown `v` → discarded
  - unknown column ids ignored
  - a `view` not in `views` ignored
  - selection/search/filters/page are **not** persisted
  - `localStorage` throwing on get/set → in-memory fallback without an error
  - no access to `localStorage` when `window` is undefined
- [X] T122 [P] [US7] Write `packages/react-data-grid/tests/component/column-management.test.tsx` covering US7 scenarios 1–5:
  - a resize via pointer events respects `minWidth`/`maxWidth`, and a keyboard resize (Alt+Arrow) steps 10px
  - reorder via the column menu "Move left/right" and via drag
  - hide/show from the menu, with hiding the last visible column prevented
  - `pinned: 'start'` has `position: sticky` and `data-pinned="start"`
  - the column state applies to grid/list field order and visibility
  - controlled `columnState`
  - `onStateChange` is called with the changed key
  - persistence round-trip across unmount/remount
  - each `enableColumn*={false}` disables the matching feature

### Implementation for User Story 7

- [X] T123 [US7] Add `columnState` handling to `packages/react-data-grid/src/state/useGridState.ts`: merge `ColumnStateItem[]` (`{ id, width?, hidden?, pinned?, order }`) over the resolved columns to produce the effective visible ordered columns (pinned-start first, then unpinned, then pinned-end). Reject hiding when it would leave 0 visible columns (data model §6.2). Apply the result to **all** views (FR-038)
- [X] T124 [P] [US7] Create `packages/react-data-grid/src/views/table/useColumnResize.ts`: a pointer-captured drag on the `.aits-resize-handle` at the header's inline-end edge (RTL aware), with the width clamped to `[minWidth, maxWidth]`. The keyboard alternative Alt+ArrowLeft/Right steps 10px on the focused header. It commits to `columnState` on pointerup
- [X] T125 [P] [US7] Create `packages/react-data-grid/src/views/table/useColumnReorder.ts`: HTML5 drag-and-drop between header cells, with a drop indicator; `reorderable: false` columns are fixed; the result is committed as new `order` values
- [X] T126 [US7] Create `packages/react-data-grid/src/views/table/ColumnMenu.tsx`: a header menu button (a `menu` role pattern, keyboard operable) with Sort asc/desc/clear, Pin start/Pin end/Unpin, Hide, Move left/Move right, and a toolbar-level **Columns** popover listing every hideable column with checkboxes. Each item respects `enableColumnResize|Reorder|Hide|Pin` and the per-column flags
- [X] T127 [US7] Implement pinned columns in `TableView.tsx`/`Row.tsx`/`Cell.tsx`: `position: sticky` with cumulative `inset-inline-start` (or end) offsets, `data-pinned`, a shadow edge when scrolled, and in `packages/react-data-grid/src/styles/grid.css` pinned cells get an opaque background so content doesn't show through
- [X] T128 [US7] Create `packages/react-data-grid/src/core/persist.ts` implementing data model §11 exactly (key `"@atharvaits/react-data-grid:" + persistStateKey`, `v: 1`, fields `view`, `sort`, `pageSize`, `columns` only, 300 ms debounced writes, try/catch everywhere, validate on read). Wire it into `useGridState.ts`: saved values act as the initial **uncontrolled** state (controlled props always win), and nothing runs during server rendering
- [X] T129 [US7] Ensure `onStateChange(state, changedKey)` fires for every change to view, sort, filters, search, page, pageSize, selection, and columnState in `useGridState.ts` (FR-040)
- [X] T130 [US7] Add Columns controls (`enableColumnResize/Reorder/Hide/Pin`, `persistStateKey` text input + a "clear saved state" button) to `apps/playground/src/settings/SettingsPanel.tsx`, log `onColumnStateChange`/`onStateChange`, and document the column management and persistence props in `packages/react-data-grid/README.md`

**Checkpoint**: All user stories are complete.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Budgets, full edge-case coverage, documentation completeness, release readiness

- [X] T131 [P] Write `packages/react-data-grid/tests/component/edge-cases.test.tsx` that renders `edgeCaseRows`/`invalidItems` equivalents (copied as fixtures into `packages/react-data-grid/tests/fixtures/edge-cases.ts`) in all three views × pages/scroll, asserting no throw and one `[ReactDataGrid]` warning per distinct issue. Cover every bullet under spec.md "Edge Cases" not already covered by T027–T030 / T072–T073 / T087–T089 / T101 / T121, and add a comment in the test mapping each case to its spec bullet (SC-005)
- [X] T132 [P] Write `packages/react-data-grid/tests/ssr/hydration.test.tsx`: `renderToString` then `hydrateRoot` in jsdom for every view, server mode, and a `persistStateKey` present → no hydration mismatch warnings (FR-045)
- [X] T133 [P] Write `packages/react-data-grid/tests/component/multi-instance.test.tsx`: two instances on one page with independent sort/selection/search and different `persistStateKey`s (FR-047); rendering the same data array twice doesn't mutate it
- [X] T134 [P] Write `packages/react-data-grid/tests/bench/pipeline.bench.ts` (Vitest bench) for sort/search/filter on 10k and 100k generated rows. Target: 10k < 500 ms, 100k < 1500 ms. Optimize `core/sort.ts`/`search.ts` if the targets are missed (SC-002, SC-004)
- [X] T135 Run `npm run build && npm run size`. If the result is over 60 KB gzip (JS+CSS), reduce it (tree-shake icons into inline SVG paths, drop duplicate helpers) until it passes (SC-008)
- [X] T136 [P] Complete `packages/react-data-grid/README.md`: a props reference table matching API contract §3 exactly, with **at least one runnable example per documented option** (SC-010), plus sections on server-side rendering, browser support, and accessibility. Also add `packages/react-data-grid/CHANGELOG.md` via `npx changeset` (initial `1.0.0` major)
- [X] T137 [P] Verify the Playground settings panel covers every prop in API contract §3 except `data`/`fetchData`/render functions (SC-012). Add a checklist comment block at the top of `apps/playground/src/settings/SettingsPanel.tsx` listing each prop → control
- [X] T138 Run `cd packages/react-data-grid && npm pack --dry-run` and confirm only `dist/**`, `package.json`, `README.md`, `LICENSE`, and `CHANGELOG.md` are included, that there is no `dependencies` field, and that `apps/playground` is absent (FR-054). Copy `React-Grid/LICENSE` into the package folder if missing
- [X] T139 Run the full `specs/specs/001-data-grid-views/quickstart.md` validation: every command in §3 exits 0, walk through the manual steps 1–14 in §2, and do the consumer smoke test in §5 in a fresh Vite React 18 app and a fresh React 19 app

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and **blocks all stories**.
- **US1 (Phase 3)**: Depends on Foundational. MVP.
- **US2 (Phase 4)**: Depends on US1 (reuses `formatValue`, toolbar placement, and the root render switch).
- **US9 (Phase 5)**: Depends on US2 (the View settings group needs the views). Every later story adds controls to the Playground.
- **US8 (Phase 6)**: Depends on US2 (applies ARIA to all three views). It should land before US3–US7 so later UI inherits correct focus handling.
- **US3 (Phase 7)**, **US4 (Phase 8)**: Depend on US8. They can run in parallel with each other, except for shared edits to `useGridState.ts` and `ReactDataGrid.tsx`, which must be serialized.
- **US5 (Phase 9)**, **US6 (Phase 10)**, **US7 (Phase 11)**: Depend on US8. US5 range selection uses the US3 pipeline order (without US3 it falls back to the original order). US7 reuses the US3 sort items in the column menu.
- **Polish (Phase 12)**: After all desired stories.

### Story dependency graph

```text
Setup → Foundational → US1 → US2 → US9 ─┐
                                 └→ US8 ─┼→ US3 ─┬→ US5
                                         │       └→ US7
                                         ├→ US4
                                         └→ US6
                                   all ──→ Polish
```

### Within Each User Story

- Test tasks are written first and must fail before implementation.
- `core/*` pure logic → state hooks → view components → root wiring → Playground controls → README.
- Tasks touching the same file (`useGridState.ts`, `ReactDataGrid.tsx`, `grid.css`, `SettingsPanel.tsx`, `README.md`) are **not** parallel across stories.

---

## Parallel Examples

### Phase 2 (Foundational)

```bash
Task: "T016 dev/warn.ts"          Task: "T017 i18n/messages.ts"
Task: "T018 core/normalize.ts"    Task: "T019 core/columns.ts"      Task: "T020 core/format.ts"
Task: "T024 styles/tokens.css"    Task: "T025 styles/grid.css"      Task: "T031 playground sample-50.ts"
# then tests:
Task: "T027 normalize.test"  Task: "T028 columns.test"  Task: "T029 format.test"  Task: "T030 useControllableState.test"
```

### User Story 2

```bash
Task: "T042 views.test.tsx"
Task: "T044 useElementSize.ts"   Task: "T045 ViewSwitcher.tsx"   Task: "T046 Toolbar.tsx"
Task: "T047 Card.tsx"            Task: "T049 ListItem.tsx + ListView.tsx"   Task: "T051 grid/list CSS"
```

### User Story 3

```bash
Task: "T072 sort.test"  Task: "T073 search/filter tests"  Task: "T074 component test"
Task: "T075 core/sort.ts"  Task: "T076 core/search.ts"  Task: "T077 core/filter.ts"
Task: "T080 HeaderCell sort"  Task: "T081 SortMenu"  Task: "T082 SearchBox"  Task: "T084 ResultSummary"
```

### User Story 4

```bash
Task: "T087 paginate.test"  Task: "T088 useVirtualRows.test"  Task: "T089 server-mode.test"  Task: "T090 perf e2e"
Task: "T091 core/paginate.ts"  Task: "T092 useVirtualRows.ts"  Task: "T096 LoadingOverlay + ErrorState"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 (US1).
2. **STOP and VALIDATE**: the Playground shows 50 records in a table; T033/T034 pass.
3. Optionally `npm pack` and try it in a real app.

### Incremental Delivery

1. + US2 → the three views (the requested headline feature).
2. + US9 → a full preview harness for everything that follows.
3. + US8 → the accessibility baseline.
4. + US3, US4 → usable with real-world data sizes.
5. + US5, US6, US7 → production polish.
6. Polish → budgets verified, docs complete, `1.0.0` changeset ready to publish.

Each checkpoint leaves `npm test`, `npm run lint`, and `npm run typecheck` green and the Playground working.

---

## Implementation Notes (deviations recorded during /speckit-implement)

- **Vite 8** instead of Vite 7 (T010/T011): the current `@vitejs/plugin-react` requires Vite 8.
- **Size check** (T009/T135) uses `@size-limit/file`: size-limit's bundler no longer bundles CSS. It measures the gzip size of `dist/index.js` + `dist/styles.css` (37.99 KB against a 60 KB budget).
- **Benchmarks** (T134): Vitest 5 removed the `bench()` API, so the benchmark became `tests/perf/pipeline.perf.test.ts`. It asserts the SC-002/SC-004 budgets (median of 5 runs, relaxable with `PERF_FACTOR`) and runs with `npm test`, or alone with `npm run bench -w packages/react-data-grid`.
- **Hot reload check** (T061): automated with Playwright. A saved change appeared after 98 ms, with no full reload and Playground state kept. Headless Playwright marks the React DevTools hook as disabled, which turns off Fast Refresh; the check restores a normal hook first.
- **Extra message keys** (minor, per API contract §9): `moveLeft`, `moveRight`, `columnMenu`, `sortBy`, `filterColumn`, `filterOperator`, `filterValue`, `filterValueTo`, `selectAllMatching`, `allOnPageSelected`, `clearSelection`, `pageStatus`, `resizeColumn`. These make every built-in string replaceable (FR-035).
- **Image type inference**: strings that are all image URLs or `data:image/` URIs are inferred as `image`, so zero-config data with avatars renders pictures. Image columns aren't searchable by default.
- **Performance**: table rows, cards and list items are memoized with stable props, so virtual scrolling re-renders only rows that enter the window.

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- Never import from `packages/**` inside `apps/playground`. Use `@atharvaits/react-data-grid` only (lint enforces this).
- Never mutate `data`; never render values as HTML outside a developer-supplied `render`.
- `React-Grid/` is not a git repository yet. Run `git init` there before relying on the CI workflow or Changesets.
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own.
