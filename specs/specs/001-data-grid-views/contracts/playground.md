# Contract: Playground (local preview app)

**Feature**: [spec.md](../spec.md) — User Story 9, FR-048 to FR-055

## 1. Commands (run from the `React-Grid/` root)

| Command | Behavior |
|---|---|
| `npm install` | Installs every workspace and links `apps/playground` → `packages/react-data-grid`. |
| `npm run dev` | Starts the Playground at `http://localhost:5173` (bound to `localhost` only) and opens it with the `default-50` scenario. |
| `npm run build:playground` | Builds the Playground (used by end-to-end tests only; never deployed in v1). |

## 2. Guarantees

1. Opens with the **same 50 records** (`sample-50`), in the same order, every time (FR-049).
2. Imports only `@atharvaits/react-data-grid` and `@atharvaits/react-data-grid/styles.css`. A lint rule rejects deep imports (FR-048).
3. A saved change in `packages/react-data-grid/src/**` appears in the browser within 3 s without a manual reload (FR-051, SC-011).
4. Not listed in the package's `files` and never published (FR-054). Not deployed anywhere (FR-055).
5. A page reload always returns to `default-50` with default settings (US9 scenario 5).

## 3. Layout

```text
┌──────────────────────────────────────────────┬──────────────────────┐
│ Scenario: [default-50 ▾]   [Reset]           │  SETTINGS            │
├──────────────────────────────────────────────┤  View ▸ Data ▸ Sort  │
│                                              │  Filter ▸ Paging ▸   │
│          <ReactDataGrid … />              │  Selection ▸ Columns │
│                                              │  Theme ▸ Locale ▸    │
│                                              │  Persistence         │
├──────────────────────────────────────────────┴──────────────────────┤
│ EVENT LOG (latest 200)  12:01:05 onSelectionChange ["EMP-003"] …    │
└─────────────────────────────────────────────────────────────────────┘
```

The layout stacks vertically below 900 px width.

## 4. Scenarios

| Id | Data | Purpose |
|---|---|---|
| `default-50` | fixed 50 employee records | Default, always available |
| `empty` | `[]` | Empty state |
| `null-data` | `null` | Missing data handling |
| `invalid-items` | mix of rows, `null`, numbers, strings | Input validation warnings |
| `edge-cases` | inconsistent keys, nested objects, circular reference, NaN/Infinity, huge strings, markup text, duplicate ids | Edge-case rendering |
| `wide-120-cols` | 30 rows × 120 fields | Horizontal scroll, card field limit |
| `large-100k` | 100,000 generated rows (seed `20260925`) | Performance |
| `server-mode` | `fetchData` over the 50 records with 600 ms delay, toggle "fail every 5th request", toggle "randomize response order" | Host-managed mode |

## 5. Settings panel coverage

Every prop in [component-api.md](./component-api.md) §3 except `data`, `fetchData`, and the render functions has a control. The render functions get toggles ("custom status badge", "custom card", "custom list item") that switch on pre-written examples (SC-012).
