# Quickstart & Validation Guide: ReactDataGrid

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to run the project and prove the feature works from start to finish. Exact APIs are in [contracts/component-api.md](./contracts/component-api.md) and [contracts/playground.md](./contracts/playground.md).

## Prerequisites

- Node.js 20 LTS or later (the dev machine has 24.x) and npm 10+
- Git
- For end-to-end tests: `npx playwright install` (one-time browser download)

All commands run from the `React-Grid/` root folder.

## 1. Install and start the Playground

```bash
npm install
npm run dev
```

**Expected**: `http://localhost:5173` opens and shows 50 employee records in the table view with the settings panel on the right (SC-011: within 30 s).

## 2. Manual validation walkthrough (Playground)

| # | Step | Expected result | Spec |
|---|---|---|---|
| 1 | Reload the page twice | The same 50 records in the same order, first row `EMP-001` | FR-049 |
| 2 | Change a default message in `packages/react-data-grid/src/i18n/messages.ts` and save | The text updates in the browser within 3 s, with no manual reload | FR-051 |
| 3 | Switch Table → Grid → List | The same records in cards, then stacked items | US2 |
| 4 | Sort Salary desc, search "an", select 2 rows, then switch views | Sort, search, and selection are kept in every view | US2 scenario 3 |
| 5 | Click the Salary header 3 times | asc → desc → original order; the empty rating stays last | US3 scenarios 1–2 |
| 6 | Filter Start Date between two dates | Only rows in the inclusive range remain; the count is shown | US3 scenario 5 |
| 7 | Scenario `empty`, then `null-data`, then `invalid-items` | "No data to display", no crash; the console shows `[ReactDataGrid]` warnings | Edge cases |
| 8 | Scenario `edge-cases` | Markup shows as literal text, circular references show `[Circular]`, NaN shows `—` | FR-004, FR-006 |
| 9 | Scenario `large-100k`, pagination = scroll, scroll to the bottom | Smooth scrolling, no long blank gaps | SC-003 |
| 10 | Scenario `server-mode`, click pages quickly with "randomize response order" on | Only the latest page's data is shown; a spinner shows while loading | US4 scenario 6 |
| 11 | "Fail every 5th request" on, then page until it fails | Error banner + Retry; earlier rows stay visible | FR-025 |
| 12 | Tab into the grid; use arrows/Home/End/Space/Enter only | Every feature is reachable; `onRowActivate` shows in the event log | FR-041 |
| 13 | Set direction RTL; resize the window to 360 px | Mirrored layout; one card column; no page-level horizontal scroll | FR-036, SC-007 |
| 14 | Enable persistence, resize and pin a column, set grid view, reload | View and column layout are restored | US7 scenario 4 |

## 3. Automated validation

```bash
npm run lint            # ESLint + Prettier check, including the Playground's no-deep-import rule
npm run typecheck       # tsc --noEmit across workspaces
npm test                # Vitest: pipeline unit tests, component tests, SSR test, axe checks
npm run build           # tsup → packages/react-data-grid/dist
npm run size            # size-limit: JS+CSS ≤ 60 KB gzip (SC-008)
npm run test:e2e        # Playwright against the Playground: views, keyboard, 360px, RTL, 100k scroll, axe (SC-006)
```

**Expected**: all commands exit with code 0.

## 4. Verify the published contents

```bash
cd packages/react-data-grid
npm pack --dry-run
```

**Expected**: only `dist/**`, `package.json`, `README.md`, and `LICENSE` are listed, with nothing from `apps/playground` (FR-054). The `dependencies` field is empty (SC-008).

## 5. Consumer smoke test (SC-001)

In any fresh React 18 or 19 app:

```bash
npm install <path-to>/React-Grid/packages/react-data-grid/@atharvaits/react-data-grid-<version>.tgz
```

```tsx
import { ReactDataGrid } from '@atharvaits/react-data-grid';
import '@atharvaits/react-data-grid/styles.css';

<ReactDataGrid data={[{ firstName: 'Ada', age: 36 }, { firstName: 'Linus', age: 54 }]} />
```

**Expected**: a table with the headers "First Name" and "Age" and two rows, plus a working view switcher.
