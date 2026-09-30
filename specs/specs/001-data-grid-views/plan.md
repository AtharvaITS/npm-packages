# Implementation Plan: ReactDataGrid — Multi-View Data Display Component

**Branch**: `001-data-grid-views` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-data-grid-views/spec.md`

## Summary

Build a dependency-free, typed React component package, `@atharvaits/react-data-grid`. It takes records through a `data` prop and shows them in **table**, **grid (cards)**, or **list** views, with:

- sort, search, and filter
- pagination or virtualized scrolling (100k rows)
- a host-managed data mode where the host loads one page at a time
- selection
- column management and saved preferences
- theming and localization
- full keyboard and screen-reader support
- safe rendering on the server

Next to it, a local **Playground** app (Vite 8) always loads the same 50 sample records and hot-reloads the package source for instant previews. Both live in one npm-workspaces monorepo at the `React-Grid/` root. Details: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), targeting ES2020 output; Node.js ≥ 20 for tooling (dev machine: Node 24.15, npm 11.12)

**Primary Dependencies**:
- **Package runtime**: none. Peer dependencies `react >=18` and `react-dom >=18`.
- **Build**: tsup.
- **Playground**: Vite 8 + React 19.
- **Dev tooling**: ESLint 9, Prettier, Changesets, size-limit.

**Storage**: None on the server side. Optional browser `localStorage` for saved preferences (`persistStateKey`), with an in-memory fallback.

**Testing**: Vitest + jsdom + @testing-library/react + user-event + vitest-axe (unit/component/SSR); Playwright + @axe-core/playwright (end-to-end against the Playground, running in Chromium, Firefox, and WebKit)

**Target Platform**: Evergreen browsers (latest 2 versions of Chrome, Edge, Firefox, Safari, including mobile); server rendering via React DOM server APIs; React 18.3 and 19.x hosts

**Project Type**: Library (published npm UI package) + a local-only development app (Playground)

**Performance Goals**:
- 10k rows: sort/search/filter/view switch ≤ 0.5 s
- 100k rows: first display ≤ 1.5 s, sort/search ≤ 1.5 s, 60 fps scrolling with no blank gaps over 100 ms (mid-range laptop)
- Playground hot reload ≤ 3 s

**Constraints**:
- ≤ 60 KB gzip for JS + CSS and zero runtime dependencies (SC-008)
- WCAG 2.2 AA
- usable at a 360 px viewport and 200% zoom
- no access to `window`/`document` during render (server-rendering safe)
- no HTML injection (values always rendered as text)
- the supplied data is never mutated

**Scale/Scope**:
- 3 views and 55 functional requirements
- about 60 public props (see [contracts/component-api.md](./contracts/component-api.md))
- datasets up to 100k rows client-side, unlimited in host-managed mode
- 8 Playground scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the **unfilled template** (placeholder principles only), so no project principles can be violated. **Gate: PASS (no gates defined).**

Until a constitution is ratified, this plan holds itself to the quality bars stated in the spec: test coverage of every edge case (SC-005), accessibility (SC-006), size budget (SC-008), and no runtime dependencies. Running `/speckit-constitution` to turn these into formal principles is recommended.

**Post-design re-check (after Phase 1)**: PASS. The design adds no unjustified complexity: two workspaces only, no runtime dependencies, and no service layer.

## Project Structure

### Documentation (this feature)

```text
specs/001-data-grid-views/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R18
├── data-model.md        # Phase 1: entities, validation, state transitions
├── quickstart.md        # Phase 1: run + validation guide
├── contracts/
│   ├── component-api.md # Public API of the package (props, types, messages, tokens)
│   └── playground.md    # Playground commands, guarantees, scenarios
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (the `React-Grid/` root, parent of this `specs/` workspace)

```text
React-Grid/
├── package.json                    # private root; npm workspaces: ["packages/*", "apps/*"]; scripts: dev, build, test, test:e2e, lint, typecheck, size
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc
├── .changeset/
├── .github/workflows/ci.yml        # lint → typecheck → test → build → size → e2e
├── specs/                          # Spec Kit workspace (this folder; not part of any package)
│
├── packages/
│   └── @atharvaits/react-data-grid/
│       ├── package.json            # name, exports, peerDependencies, files: ["dist"], sideEffects: ["*.css"]
│       ├── tsup.config.ts
│       ├── .size-limit.json
│       ├── README.md
│       ├── src/
│       │   ├── index.ts                     # public exports only (contract §2)
│       │   ├── ReactDataGrid.tsx         # root: resolves props → state → pipeline → view
│       │   ├── types.ts                     # public types
│       │   ├── core/                        # pure, framework-free logic (unit tested)
│       │   │   ├── normalize.ts             # data validation, row ids, value access by path
│       │   │   ├── columns.ts               # column derivation, header humanizing, type inference
│       │   │   ├── format.ts                # default Intl-based display formatting
│       │   │   ├── search.ts                # accent/case-insensitive search + cache
│       │   │   ├── filter.ts                # operators per type
│       │   │   ├── sort.ts                  # stable, collator-based, empties last, multi-sort
│       │   │   ├── paginate.ts              # page clamping and ranges
│       │   │   ├── selection.ts             # single/multi/range/select-all rules
│       │   │   └── persist.ts               # versioned localStorage read/write
│       │   ├── state/
│       │   │   ├── useControllableState.ts
│       │   │   ├── useGridState.ts          # combines view state + transitions (data-model §6.1)
│       │   │   ├── useServerData.ts         # fetchData, abort, latest-request-wins
│       │   │   └── GridContext.ts
│       │   ├── virtual/
│       │   │   ├── useVirtualRows.ts        # fixed-size windowing, overscan
│       │   │   └── useElementSize.ts        # ResizeObserver, SSR-safe
│       │   ├── a11y/
│       │   │   ├── useRovingFocus.ts        # 2D arrow navigation
│       │   │   └── LiveRegion.tsx
│       │   ├── views/
│       │   │   ├── table/ (TableView.tsx, HeaderCell.tsx, Row.tsx, ColumnMenu.tsx, useColumnResize.ts, useColumnReorder.ts)
│       │   │   ├── grid/  (GridView.tsx, Card.tsx)
│       │   │   └── list/  (ListView.tsx, ListItem.tsx)
│       │   ├── toolbar/ (Toolbar.tsx, ViewSwitcher.tsx, SearchBox.tsx, FilterPanel.tsx, SelectionBar.tsx)
│       │   ├── pagination/Pagination.tsx
│       │   ├── states/ (EmptyState.tsx, ErrorState.tsx, LoadingOverlay.tsx)
│       │   ├── i18n/messages.ts             # defaultMessages
│       │   ├── dev/warn.ts                  # dev-only warnings
│       │   └── styles/                      # grid.css (@layer aits), tokens.css → built to dist/styles.css
│       └── tests/
│           ├── unit/                        # core/* against every input edge case
│           ├── component/                   # views, controlled/uncontrolled, keyboard, axe
│           ├── ssr/                         # renderToString in a node environment
│           └── types/                       # expectTypeOf checks for the public API
│
└── apps/
    └── playground/
        ├── package.json            # private; depends on "@atharvaits/react-data-grid": "*"
        ├── vite.config.ts          # alias → packages/react-data-grid/src (hot reload), server.host = localhost
        ├── index.html
        ├── src/
        │   ├── main.tsx
        │   ├── App.tsx             # layout: grid | settings | event log
        │   ├── data/
        │   │   ├── sample-50.ts    # FIXED 50 employee records (never generated)
        │   │   ├── generate.ts     # seeded mulberry32 generator for large-100k / wide-120-cols
        │   │   └── scenarios.ts    # the 8 scenarios (contracts/playground.md §4)
        │   ├── settings/SettingsPanel.tsx
        │   ├── events/EventLog.tsx
        │   └── examples/           # custom badge / card / list-item render examples
        └── e2e/                    # Playwright specs (views, a11y, keyboard, rtl, mobile, perf, server-mode)
```

**Structure Decision**:
- **Code location**: the code goes in the `React-Grid/` folder (the empty project the user created), next to the existing `specs/` Spec Kit workspace. The workspace itself stays unchanged.
- **Two npm workspaces**: `packages/react-data-grid` (published) and `apps/playground` (private, local-only).
- **Framework-free core**: all data logic lives in `core/` as pure functions, so it can be unit-tested exhaustively and reused by both client-side and host-managed modes.
- **Views are thin**: they only render what the pipeline produces.

## Delivery Phasing (maps to spec priorities)

| Phase | Scope | User stories |
|---|---|---|
| 1 | Monorepo scaffold, tooling, Playground shell with `sample-50`, hot reload | US9 (foundation) |
| 2 | `core/` normalize, columns, format + TableView with zero config | US1 |
| 3 | Grid and List views, switcher, state kept across views | US2 |
| 4 | Accessibility baseline (roving focus, ARIA, live region), responsiveness, RTL | US8 |
| 5 | Sort / search / filter | US3 |
| 6 | Pagination, virtualization, host-managed mode | US4 |
| 7 | Selection and activation | US5 |
| 8 | Column definitions, render functions, theme, messages, locale | US6 |
| 9 | Column resize/reorder/hide/pin, persistence, `onStateChange` | US7 |
| 10 | Remaining Playground scenarios + settings coverage, docs, size and e2e gates | US9 (complete), SC-001…SC-012 |

Accessibility (phase 4) comes before the feature-heavy phases so later work is built on correct roles and focus handling instead of being retrofitted.

## Complexity Tracking

No constitution violations to justify.

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Custom virtualizer instead of a library | SC-008 forbids required runtime dependencies | `@tanstack/react-virtual` would add a runtime dependency |
| Monorepo (2 workspaces) | Playground must use the public entry point and stay unpublished (FR-048, FR-054) | A `demo/` folder inside the package risks publishing it and mixing dependencies |
