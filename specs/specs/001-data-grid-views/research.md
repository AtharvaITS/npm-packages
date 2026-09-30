# Research: ReactDataGrid — Multi-View Data Display Component

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-25

Each entry records the decision, why it was chosen, and what else was considered. Together they resolve every open item in the plan's Technical Context.

---

## R1. Where the source code lives

- **Decision**: Put the code in the `React-Grid/` folder the user already created (the parent of this `specs/` Spec Kit workspace), laid out as an npm-workspaces monorepo:
  - `React-Grid/packages/react-data-grid/` — the published package
  - `React-Grid/apps/playground/` — the local preview app
- **Rationale**: The user said the React-Grid project "is already created which is empty", so that is the natural home for the code. Keeping the Spec Kit documents in `React-Grid/specs/` keeps the specs next to the code without mixing them into the package. A workspace monorepo lets the Playground depend on the package the same way an installed copy would (FR-048), while keeping it out of the published package (FR-054).
- **Alternatives considered**:
  - A single package with a `demo/` folder: the demo's dependencies leak into the package and publishing needs extra exclusions.
  - Two separate repositories: the Playground can't show unpublished source changes within 3 seconds (FR-051).
  - Code inside the `specs/` folder: confusing folder name, and the Spec Kit tooling would sit inside the package root.

## R2. Language and React version support

- **Decision**: TypeScript 5.x in `strict` mode. React and ReactDOM `>=18.0.0` as **peer dependencies**, tested against React 18.3 and React 19.x.
- **Rationale**: Type declarations are required (FR-046), and writing in TypeScript produces them automatically. A peer dependency keeps a single copy of React in the host app. React 18 and later give `useSyncExternalStore`, `useId`, and `startTransition`, which are needed for server-rendering safety (FR-045) and responsive filtering.
- **Alternatives considered**: JavaScript with hand-written `.d.ts` files (declarations drift out of sync with the code); supporting React 17 (no `useId`/`useSyncExternalStore`, so more polyfill code and more size).

## R3. Package manager and workspace tooling

- **Decision**: npm workspaces (npm 10+, Node 20 LTS or later; Node 24 and npm 11 are already installed on the dev machine).
- **Rationale**: Nothing extra to install on Windows, and one `npm install` at the root links the Playground to the local package.
- **Alternatives considered**: pnpm (stricter and faster, but one more tool to install); Turborepo or Nx (overkill for two workspaces).

## R4. Building the package

- **Decision**: **tsup** (esbuild-based) outputs:
  - ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`)
  - type declarations (`dist/index.d.ts`, `dist/index.d.cts`)
  - a separate stylesheet `dist/styles.css`

  `package.json` uses an `exports` map, `"sideEffects": ["*.css"]`, and `"files": ["dist"]`.
- **Rationale**: Hosts are either ESM or CJS, and bundlers need both formats plus correct types. tsup is zero-config for libraries. The `files` allow-list guarantees the Playground and tests are never published (FR-054).
- **Alternatives considered**: Vite library mode (fine, but its type-declaration step needs a plugin); Rollup (more configuration); publishing ESM only (breaks older Jest/CJS hosts).

## R5. Styling approach

- **Decision**: Plain CSS shipped as `@atharvaits/react-data-grid/styles.css` and imported once by the host. All rules sit inside `@layer aits` and use class names prefixed `aits-`. Every visual value is a CSS custom property (`--aits-color-bg`, `--aits-row-height`, …). The `theme` prop sets these properties on the root element. Density and dark mode switch via `data-density` and `data-color-scheme` attributes. `prefers-color-scheme` is the default when `colorScheme="auto"`.
- **Rationale**:
  - No runtime cost and no dependency, which supports the SC-008 size budget.
  - Works with server rendering (FR-045) and with strict Content Security Policies (no injected `<style>` tags).
  - The cascade layer lets hosts override styles without specificity battles (FR-033).
  - One import line still meets SC-001 (live in 5 minutes).
- **Alternatives considered**:
  - CSS-in-JS (runtime cost and server-rendering complexity).
  - Tailwind (forces the host's build setup).
  - CSS Modules (hashed class names make overrides hard).
  - Injecting styles at runtime (breaks strict CSP and causes a flash of unstyled content on server-rendered pages).

## R6. Handling 100,000 records (virtualization)

- **Decision**: A **built-in, dependency-free virtualizer**:
  - table rows and list items: fixed row height from the density setting, using `--aits-row-height`
  - grid view: fixed card height, virtualized row by row, with the column count measured by a `ResizeObserver`
  - an overscan of 5 rows
  - on the server, only the first page (or first 50 rows) is rendered

  Pagination mode renders only the current page and skips virtualization.
- **Rationale**: SC-008 forbids required third-party runtime dependencies. Fixed-size virtualization is about 150 lines and reliably gives smooth 60 fps scrolling at 100k rows (SC-003). Variable row heights are not needed because long text is truncated with an ellipsis (spec edge case).
- **Alternatives considered**: `@tanstack/react-virtual` (excellent, but a runtime dependency); `react-window` (dependency, and old-style APIs); rendering everything (100k DOM rows freezes the browser).

## R7. Sorting, searching, and filtering at scale

- **Decision**:
  - **Data pipeline**: a pure-function pipeline `normalize → derive → search → filter → sort → paginate`. It runs inside `useMemo` keyed on its inputs, and search/filter input changes are wrapped in `startTransition`.
  - **Text comparison**: `Intl.Collator(locale, { numeric: true, sensitivity: 'base' })` (natural order, e.g. "item2" before "item10", and accent-insensitive).
  - **Search**: accent-insensitive via `String.prototype.normalize('NFD')` with combining marks stripped, compared in lowercase. Each row's search text is precomputed and cached in a `WeakMap` keyed by the row object.
  - **Sort**: stable (`Array.prototype.sort`, stable since ES2019) over a precomputed array of `[sortKey, originalIndex]`. Empty values always go last. Mixed-type order is number < text < empty.
  - **Search debounce**: 200 ms.
- **Rationale**: Measured order of magnitude: collator-based sorting of 100k strings takes about 150–300 ms and filtering about 30 ms on a mid-range laptop, well inside SC-002 and SC-004. Pure functions are easy to unit-test against every edge case (SC-005).
- **Alternatives considered**: Web Workers (moving data between threads costs more than it saves at this scale, and it complicates server rendering); the `localeCompare` method called directly (about 10× slower than a reused Collator).

## R8. Host-managed data mode (host loads one page at a time)

- **Decision**: `dataMode="server"` plus a `fetchData(request, { signal }) => Promise<{ rows, totalCount }>` prop. The component:
  - builds a `DataRequest` from the view state
  - debounces search (200 ms)
  - aborts the previous request's `AbortSignal` when a new one starts
  - ignores any result whose request id is not the latest

  A host that prefers to manage loading itself can instead use `onDataRequest(request)` together with the props `rows`, `totalCount`, `loading`, and `error`.
- **Rationale**: The promise form makes the out-of-order protection (US4 scenario 6, FR-025) a built-in guarantee instead of something every host must implement. The prop-driven form supports hosts that use their own data layer (React Query, Redux, …).
- **Alternatives considered**: Callback only (every host would have to re-implement stale-response handling); a built-in HTTP client (out of scope, since the component never fetches data itself).

## R9. Controlled vs. uncontrolled state

- **Decision**: Every piece of view state (`view`, `sort`, `filters`, `search`, `page`, `pageSize`, `selection`, `columnState`) follows the standard React pattern:
  - the `x` prop makes it controlled
  - the `defaultX` prop sets the initial value when uncontrolled
  - `onXChange` reports every change

  An aggregate `onStateChange(state)` is also provided (FR-040). Internally, a `useControllableState` hook resolves which mode is in use.
- **Rationale**: Familiar to React developers, and it is what FR-011, FR-028, and FR-040 require.
- **Alternatives considered**: A single `state`/`onStateChange` pair only (clumsy when a host wants to control one thing); an imperative ref API only (not declarative).

## R10. Accessibility patterns

- **Decision**:
  - **Table view**: ARIA `role="grid"` with `aria-rowcount`/`aria-colcount`/`aria-rowindex`/`aria-colindex` so virtualized rows are announced with their true position, `aria-sort` on headers, and a roving `tabindex` for arrow/Home/End/PageUp/PageDown/Ctrl+Home navigation (WAI-ARIA APG Data Grid pattern).
  - **Grid view**: `role="grid"` with one card per cell and 2D arrow navigation.
  - **List view**: `role="listbox"` when selection is on, `role="list"` otherwise, with Up/Down navigation.
  - **Announcements**: a polite live region announces "N results" after sort, filter, search, or page changes.
  - **Focus**: visible `:focus-visible` rings with at least 3:1 contrast.
- **Rationale**: Meets FR-041 to FR-043 and SC-006, and the APG patterns are what screen-reader users expect.
- **Alternatives considered**: A native `<table>` with tab stops on every cell (hundreds of tab stops, and it can't be virtualized with correct semantics).

## R11. Record identity

- **Decision**: A `getRowId` prop, either a field key or a function. Without it, identity is the record's index in the supplied array, and a development-only warning is emitted once when a declared id field is missing or duplicated.
- **Rationale**: Keeps selection stable across data changes (FR-007, and the edge cases for removed selected rows).

## R12. Development-only warnings

- **Decision**: A `warn()` helper wrapped in `if (process.env.NODE_ENV !== 'production')`. It deduplicates by message and uses the `[ReactDataGrid]` prefix.
- **Rationale**: Host bundlers remove these warnings from production builds, which satisfies FR-004 at zero production cost.

## R13. Saved preferences (preference-saving)

- **Decision**: `persistStateKey` prop. The component writes `localStorage["@atharvaits/react-data-grid:" + key]` as JSON `{ v: 1, view, sort, pageSize, columns }`, with writes debounced by 300 ms. Every access is wrapped in try/catch. On load the saved data is validated: an unknown version is discarded, unknown fields are ignored, and on any failure the component falls back to in-memory storage. Nothing is saved during server rendering.
- **Rationale**: Covers FR-039 and the edge cases for unavailable storage and stale fields.

## R14. Playground app

- **Decision**: **Vite 8 + React 19** single-page app (Vite 7 was planned; the current `@vitejs/plugin-react` requires Vite 8) in `apps/playground`. It depends on `"@atharvaits/react-data-grid": "*"` (the workspace link). Vite `resolve.alias` points `@atharvaits/react-data-grid` → `packages/react-data-grid/src/index.ts` and `@atharvaits/react-data-grid/styles.css` → the source stylesheet, so edits hot-reload in under 1 second without rebuilding the package. The dev server runs on `localhost:5173` only (no public hosting in v1, per Clarification Q2). Layout:
  - the component on the left
  - a settings panel on the right (plain form controls covering every prop)
  - an event log below

  The Playground imports **only** from `@atharvaits/react-data-grid` (enforced by an ESLint `no-restricted-imports` rule that blocks `../../packages/**` deep imports), which satisfies FR-048's public-entry-point rule.
- **Rationale**: Vite's hot reload is the fastest widely used option, easily meeting SC-011 (under 3 s). Aliasing to the source entry keeps the "public entry point only" guarantee while avoiding a watch-build step.
- **Alternatives considered**: Storybook (rejected in Clarification Q1); Next.js (server framework, unnecessary); consuming `dist/` with a `tsup --watch` build (slower, two processes).

## R15. Sample data (fixed 50 records and scenarios)

- **Decision**:
  - **The 50 default records**: stored as a hand-written static file `apps/playground/src/data/sample-50.ts` (an employee directory, which naturally has text, numbers, currency, booleans, dates, avatars, status, and a nested address).
  - **The 100,000-record scenario**: produced by a deterministic generator (`mulberry32` seeded PRNG, seed `20260925`) so it is reproducible without depending on faker.
  - **Other scenarios** (empty, invalid, edge cases, host-managed with a simulated 600 ms delay and a toggle to fail 1 request in 5): stored as small static modules.
  - **Images**: avatar images are inline SVG data URIs (initials on a colored circle), so the Playground works offline.
- **Rationale**: FR-049 requires identical content and order on every start, and a static file is the simplest guarantee. Covers FR-050's type mix and irregular values, and FR-053's scenarios.
- **Alternatives considered**: Faker at runtime (non-deterministic unless seeded, and heavy); fetching from a public API (network dependency, not fixed).

## R16. Testing strategy

- **Decision**:
  - **Unit tests**: **Vitest** + jsdom for the pure data pipeline (sort/filter/search/paginate/derive/normalize), including every input edge case in the spec (SC-005).
  - **Component tests**: **@testing-library/react** + `@testing-library/user-event` for behavior across the three views, controlled/uncontrolled props, and keyboard navigation. **vitest-axe** covers automated accessibility checks at component level.
  - **End-to-end tests**: **Playwright** (Chromium, Firefox, WebKit) against the Playground covering:
    - view switching and state preservation
    - a 360px viewport
    - 200% zoom
    - RTL layout
    - a scroll-smoothness test at 100k rows (frame timing)
    - **@axe-core/playwright** with zero WCAG 2.2 AA violations in light and dark themes (SC-006)
  - **Server-rendering test**: `renderToString` inside Vitest in a `node` environment (FR-045).
  - **Size check**: **size-limit** with `@size-limit/file` (gzip of `dist/index.js` + `dist/styles.css`) and a budget of 60 KB (SC-008). The bundling preset can't process CSS.
  - **Performance tests**: `tests/perf/pipeline.perf.test.ts` asserts the SC-002/SC-004 budgets. Vitest 5 removed `bench()`.
  - **Type tests**: `tsd`-style checks via `expectTypeOf` in Vitest.
- **Rationale**: Covers every success criterion with automated checks; Playwright doubles as a guard that the Playground keeps working.

## R17. Code quality and releases

- **Decision**:
  - **Lint and format**: ESLint 9 (flat config) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-jsx-a11y`, plus Prettier.
  - **Versioning**: Changesets drives versioning and the changelog.
  - **Checks on each change**: GitHub Actions workflow running lint → typecheck → unit tests → build → size-limit → Playwright.
  - **License**: MIT.
- **Rationale**: Standard for published React libraries. The license decision was left open in the spec; MIT is the most common choice for UI components and can be changed before the first publish.

## R18. Package and export naming

- **Decision**: npm package name `@atharvaits/react-data-grid` (npm requires lowercase). The main component is exported as `ReactDataGrid`. Types (`ReactDataGridProps`, `ColumnDef`, …) and small helpers (`createColumns`) are exported from the same entry. Renaming later is a find-and-replace plus one `package.json` field (spec Assumption).
