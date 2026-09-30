# Feature Specification: ReactDataGrid — Multi-View Data Display Component

**Feature Branch**: `001-data-grid-views`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "A NPM package for React applications, Currently name is temporary set to ReactDataGrid and the project React-Grid is already created which is empty. Ideally once the package is installed, input data should be supplied via a prop. Consider all the edge cases and features, this should also give functionality on frontend to render the data in grid, table, list format."

## Overview

ReactDataGrid is an installable, reusable UI component that application developers drop into their React applications. The developer hands it a collection of records through a single input property, and the component presents those records to end users in one of three interchangeable layouts:

- **Table view** — records as rows, fields as columns.
- **Grid view** — records as cards/tiles arranged in a responsive multi-column layout.
- **List view** — records as stacked, full-width items with a primary line and supporting details.

Two audiences are served:

- **Integrating developer** — installs the package, supplies data and optional configuration, and listens for user interactions.
- **End user** — the person using the host application who views, switches layouts, sorts, filters, searches, pages through, and selects records.
- **Package maintainer** — builds and changes the package itself and uses the Playground to see the effect of every change.

## Clarifications

### Session 2026-09-25

- Q: Which kind of preview tool should the project include so the component can be seen working with a fixed set of 50 sample records whenever the code changes? → A: A Playground web app in the same project. It uses the package's live source, always loads the same 50 sample records, refreshes automatically on code changes, and has a settings panel for every option.
- Q: Should the Playground also be published as a public demo website that anyone can open, and if so, when should that site update? → A: No. It is local only and runs on the maintainer's own computer. No public demo site in v1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render supplied data with zero configuration (Priority: P1)

A developer installs the package, places the component on a page, and passes an array of records through the data property. Without any further configuration, the component displays the records in the default table view, deriving column headers from the record fields and formatting common value types (text, numbers, booleans, dates, empty values) in a readable way.

**Why this priority**: This is the core promise of the package: "install, pass data, see it." Every other capability builds on it, and on its own it already replaces hand-built tables.

**Independent Test**: Install the package into a blank host application, pass a sample array of 20 records, and confirm every record and field is visible and readable with no other configuration.

**Acceptance Scenarios**:

1. **Given** an array of 20 records sharing the same fields, **When** the developer renders the component with only the data property, **Then** the table view shows 20 rows and one column per field, with human-readable headers derived from field names (e.g., `firstName` → "First Name").
2. **Given** records whose fields differ from one another, **When** the component renders, **Then** columns are the union of all fields across records and missing values show as an empty cell (not "undefined" or "null").
3. **Given** an empty array, **When** the component renders, **Then** an "empty" message is shown (default text "No data to display", replaceable by the developer) instead of a blank area.
4. **Given** the developer later supplies a new array through the same property, **When** the component re-renders, **Then** the displayed records update to match the new data without a page reload.
5. **Given** a record containing text such as `<script>alert(1)</script>`, **When** it is displayed, **Then** it appears as literal text and is never executed or interpreted as markup.

---

### User Story 2 - Switch between table, grid, and list views (Priority: P1)

An end user sees a view switcher and changes how the same records are presented: table for comparing fields, grid for visually scanning items (e.g., products with images), list for reading items one after another. The developer can choose the default view, restrict which views are offered, or hide the switcher and control the view entirely from the host application.

**Why this priority**: Multi-format rendering is explicitly requested and is the package's main differentiator from a plain table.

**Independent Test**: Render the component with sample data, switch to each of the three views, and confirm the same records appear in each with correct content, and that current sort/filter/search/selection survive each switch.

**Acceptance Scenarios**:

1. **Given** the component is showing the table view, **When** the end user selects "Grid", **Then** the same records appear as cards, each showing a title field plus the remaining visible fields as labelled values.
2. **Given** the component is showing any view, **When** the end user selects "List", **Then** the records appear as stacked items with a primary line (title field) and secondary details.
3. **Given** the end user has sorted, filtered, searched, and selected two records in table view, **When** they switch to grid view and back, **Then** sort order, filters, search text, selection, and page position are preserved.
4. **Given** the developer allows only table and list views, **When** the component renders, **Then** the switcher offers only those two options; if only one view is allowed, the switcher is hidden.
5. **Given** the developer sets the default view to "grid", **When** the component first renders, **Then** grid view is shown.
6. **Given** the developer controls the current view from the host application, **When** the end user uses the switcher, **Then** the component notifies the host of the requested view and displays whatever view the host then specifies.
7. **Given** the developer provides no title field, **When** grid or list view renders, **Then** the first visible field is used as the item title.

---

### User Story 3 - Sort, search, and filter records (Priority: P2)

An end user narrows and orders the records to find what they need: clicking a column header (or choosing a sort field in grid/list view) to sort ascending/descending, typing into a search box to match across all visible fields, and applying per-field filters appropriate to the field's type.

**Why this priority**: Data display without the ability to find things becomes unusable beyond a few dozen records; these are the most expected interactions of any data grid.

**Independent Test**: With 500 sample records, sort by a numeric field, search a known term, and apply a filter; verify the resulting record set and order are correct.

**Acceptance Scenarios**:

1. **Given** a column of numbers, **When** the end user activates its sort control once, twice, and three times, **Then** records are ordered ascending, then descending, then returned to the original supplied order.
2. **Given** a column mixing values and empty values, **When** it is sorted in either direction, **Then** empty values are always placed last.
3. **Given** text values with mixed case and accented characters, **When** sorted, **Then** the order is natural and language-aware (e.g., "item2" before "item10"; "éclair" sorts near "eclair").
4. **Given** the end user types "smith" in the search box, **When** matching completes, **Then** only records containing "smith" (case-insensitive) in any visible field are shown and the match count is displayed.
5. **Given** a date field, **When** the end user applies a "between" filter, **Then** only records within the inclusive date range remain.
6. **Given** filters and search are both active, **When** results are shown, **Then** only records satisfying all active conditions appear, and a single "clear all" action restores the full set.
7. **Given** the developer enables multi-field sorting, **When** the end user adds a secondary sort, **Then** records are ordered by the primary field then by the secondary field.
8. **Given** the developer marks a field as not sortable or not filterable, **When** the end user views that field, **Then** no sort/filter control is offered for it.

---

### User Story 4 - Handle large datasets and pagination (Priority: P2)

An end user works with thousands to hundreds of thousands of records and the component remains responsive. The developer chooses between page-by-page navigation (with selectable page size) or continuous scrolling. For data too large to ship to the browser, the developer can switch the component into a "host-managed" mode where the host supplies one page of data at a time and responds to sort/filter/page requests.

**Why this priority**: Real-world datasets are frequently large; poor performance at scale is the most common reason teams abandon a grid component.

**Independent Test**: Supply 100,000 records, scroll and page through them, sort and search; confirm the interface stays responsive. Separately, run host-managed mode against a simulated slow data source and confirm requests and loading states behave correctly.

**Acceptance Scenarios**:

1. **Given** 100,000 records and continuous scrolling, **When** the end user scrolls from top to bottom, **Then** scrolling stays smooth and content appears without visible blank gaps lasting more than a brief moment.
2. **Given** pagination with page size 25, **When** the end user goes to page 3, **Then** records 51–75 of the current (sorted/filtered) set are shown along with "51–75 of N" and navigation controls.
3. **Given** the end user is on page 10 and a filter reduces results to 2 pages, **When** results update, **Then** the component moves to the last valid page instead of showing an empty page.
4. **Given** host-managed mode, **When** the end user changes sort, filter, search, or page, **Then** the component notifies the host with the complete current request (page, page size, sort, filters, search) and shows a loading indicator until new data arrives.
5. **Given** host-managed mode and the host reports a total record count, **When** the component renders, **Then** pagination reflects the total count, not just the number of records currently supplied.
6. **Given** host-managed mode and the end user triggers two requests quickly, **When** responses arrive out of order, **Then** only the data for the latest request is displayed.

---

### User Story 5 - Select records and act on them (Priority: P3)

An end user selects one or many records (checkbox, click, or keyboard) and the host application is notified so it can offer actions like delete, export, or open details. The developer can also respond to a record being clicked/activated.

**Why this priority**: Selection turns the component from a read-only display into an interactive part of a workflow, but the component is still valuable without it.

**Independent Test**: Enable multi-selection, select records across pages, use "select all", and verify the host receives the correct set of selected record identifiers each time.

**Acceptance Scenarios**:

1. **Given** single-selection mode, **When** the end user selects a second record, **Then** the first is deselected and the host is notified of the new selection.
2. **Given** multi-selection mode, **When** the end user uses "select all", **Then** all records matching the current filters/search are selected (not only the visible page), and the UI states how many are selected.
3. **Given** a range-select gesture (e.g., Shift+click) in multi-selection mode, **When** the end user selects a first and last record, **Then** all records between them in the current order are selected.
4. **Given** selected records, **When** new data is supplied that no longer contains some of them, **Then** those records are removed from the selection and the host is notified.
5. **Given** the developer marks certain records as not selectable, **When** the end user tries to select them, **Then** they cannot be selected and "select all" skips them.
6. **Given** the developer listens for record activation, **When** the end user clicks or presses Enter on a record in any view, **Then** the host is notified with that record.

---

### User Story 6 - Customize columns, fields, and appearance (Priority: P3)

A developer tailors presentation: choosing which fields appear and in what order, renaming headers, setting widths and alignment, formatting values (currency, dates, percentages), providing custom content for a cell/card/list item (e.g., an avatar, status badge, action buttons), choosing the card image field, and adjusting look-and-feel to match the host application's brand, including light/dark appearance and density (compact/standard/comfortable).

**Why this priority**: Needed for production polish, but the automatic defaults of P1 already provide a usable result.

**Independent Test**: Supply column definitions that hide one field, rename another, format a currency field, and provide a custom status badge; verify all apply consistently across table, grid, and list views.

**Acceptance Scenarios**:

1. **Given** the developer supplies field definitions, **When** the component renders, **Then** only the defined fields appear, in the defined order, with the defined labels — in every view.
2. **Given** a field with a formatter (e.g., currency in USD), **When** displayed, **Then** the formatted value is shown while sorting and filtering still use the underlying raw value.
3. **Given** a field with custom display content, **When** rendered in any view, **Then** the developer's content is shown in place of the default value display.
4. **Given** a derived field computed from other fields (e.g., full name from first and last name), **When** displayed, **Then** it behaves like any other field for sorting, searching, and display.
5. **Given** the developer supplies a custom card layout for grid view or item layout for list view, **When** that view is shown, **Then** the custom layout is used for each record.
6. **Given** theme settings (colors, spacing, font, density, light/dark), **When** applied, **Then** the component's appearance updates accordingly without the developer overriding internal styles.
7. **Given** the developer supplies translated labels for all built-in text (e.g., "Search", "No data to display", "Rows per page"), **When** the component renders, **Then** all built-in text uses the supplied translations, and numbers/dates follow the configured locale.

---

### User Story 7 - Manage columns interactively and remember preferences (Priority: P3)

An end user in table view resizes columns, reorders them by dragging, hides/shows columns from a column menu, and pins important columns to the left or right so they stay visible while scrolling horizontally. The developer can opt in to remembering these preferences (along with view, sort, and page size) so the end user returns to the same setup.

**Why this priority**: Improves productivity for power users with wide datasets; not required for basic value.

**Independent Test**: Resize, reorder, hide, and pin columns, reload the host page with preference-saving enabled, and confirm the layout is restored.

**Acceptance Scenarios**:

1. **Given** table view, **When** the end user drags a column edge, **Then** the column width changes and respects developer-defined minimum and maximum widths.
2. **Given** the column menu, **When** the end user hides a column, **Then** it disappears from all views and can be restored from the same menu; the last visible column cannot be hidden.
3. **Given** a column pinned left and a wide table, **When** the end user scrolls horizontally, **Then** the pinned column stays in place.
4. **Given** preference-saving is enabled with a developer-supplied key, **When** the end user reloads the page, **Then** view, column order/width/visibility/pinning, sort, and page size are restored.
5. **Given** saved preferences reference a field that no longer exists in the data, **When** restored, **Then** the missing field is ignored and the rest of the preferences still apply.

---

### User Story 8 - Accessible and responsive use (Priority: P2)

An end user using a keyboard only, a screen reader, or a small mobile screen can use every feature of the component.

**Why this priority**: Accessibility is a baseline quality and often a legal requirement for the host applications that adopt the package; retrofitting it later is expensive.

**Independent Test**: Complete view switching, sorting, searching, paging, and selection using only the keyboard and a screen reader, and on a 360px-wide viewport.

**Acceptance Scenarios**:

1. **Given** keyboard-only use, **When** the end user tabs into the component, **Then** focus lands on a logical element, arrow keys move between cells/cards/items, and every control is reachable and operable.
2. **Given** a screen reader, **When** the end user navigates the table, **Then** row/column position, header names, sort state, and selection state are announced.
3. **Given** a sort, filter, or page change, **When** the result updates, **Then** a screen-reader announcement states the new result count.
4. **Given** a narrow viewport (360px wide), **When** the component renders, **Then** grid view reduces to one column, the toolbar remains usable, and the table view scrolls horizontally without the page itself overflowing.
5. **Given** a right-to-left language setting, **When** the component renders, **Then** layout, alignment, pinning, and navigation directions mirror correctly.

---

### User Story 9 - Preview every change in a Playground with fixed sample data (Priority: P1)

A package maintainer starts the Playground, a small web app that lives in the same project as the package. It always opens with the same built-in set of 50 sample records and shows the component using the package's current source. Whenever the maintainer saves a change to the package, the Playground refreshes by itself. A settings panel next to the component turns every configurable option on and off, so each feature in this spec can be checked by eye without writing code.

**Why this priority**: It is the main way to check all other user stories during development, and it is the reference setup for manual testing and documentation screenshots.

**Independent Test**: Start the Playground, confirm 50 sample records appear in all three views, change a visible label in the package source, and confirm the Playground shows the change without a manual reload.

**Acceptance Scenarios**:

1. **Given** the Playground is started, **When** it opens, **Then** exactly the same 50 sample records are displayed every time, identical in content and order across restarts and machines.
2. **Given** the Playground is open, **When** the maintainer saves a change to the package source, **Then** the Playground shows the updated component within 3 seconds without a manual page reload, keeping settings-panel choices where possible.
3. **Given** the settings panel, **When** the maintainer changes an option (view, allowed views, selection mode, pagination vs. scrolling, page size, density, theme, light/dark, locale, right-to-left, column options, preference-saving), **Then** the component updates immediately to reflect it.
4. **Given** the Playground, **When** the maintainer picks an alternate dataset from a small built-in menu (empty, invalid input, edge-case records, 100,000 generated records, host-managed mode with simulated delay and failure), **Then** the component shows that scenario, and a "reset" action returns to the default 50 records.
5. **Given** the Playground, **When** the maintainer reloads the page, **Then** it returns to the 50 default sample records.
6. **Given** the Playground, **When** it is built, **Then** it uses the package exactly as an external developer would (through the package's public entry point only), so anything that works in the Playground works for developers who install it.

---

### Edge Cases

**Input data**

- Data property is missing, `null`, or `undefined` → treated as empty; the empty state is shown; no crash.
- Data property is not an array (object, string, number) → treated as empty; a clear developer-facing warning is emitted in development builds; no crash.
- Array contains non-record items (`null`, numbers, strings) → those items are skipped with a development warning; valid records still display.
- Records have inconsistent field sets → columns are the union of fields; missing values show empty.
- Field names with spaces, dots, dashes, or non-Latin characters → displayed and addressable correctly.
- Nested objects (e.g., `address.city`) → developer can reference nested values by path; un-configured nested objects/arrays display as a short readable summary, not "[object Object]".
- Values of unusual types (functions, symbols, circular references, very large numbers, `NaN`, `Infinity`) → displayed safely as text or empty, never crash.
- Very long text or unbroken strings → truncated with an ellipsis and full value available on hover/focus; layout does not break.
- Values containing markup or script → always displayed as plain text.
- Numbers or dates stored as text (e.g., "42", "2026-01-05") → sorted as text unless the developer declares the field type; when declared, they sort/filter by their true type.
- Duplicate or missing record identifiers → the developer can designate an identifier field; if absent or duplicated, the component falls back to position-based identity and warns in development builds (selection may not persist across data changes in that case).
- A field present in the data but with zero records → no column is derived; a column explicitly defined by the developer still shows with empty values.
- Only one record, or a record with a single field → renders normally in all views.
- Very wide datasets (100+ fields) → table scrolls horizontally; grid/list show a developer-configurable subset (default: first 6 fields) to avoid unreadable cards.

**Data changes and state**

- Data is replaced while the user has sort/filter/search active → the active conditions are re-applied to the new data.
- Data shrinks so the current page no longer exists → the component moves to the last valid page.
- Selected records disappear from new data → they are dropped from the selection and the host is notified.
- Supplied data must never be modified by the component (sorting/filtering operate on a separate ordering).
- The same data array is re-supplied unchanged → no unnecessary visual flicker or lost scroll position.
- Multiple instances on the same page → operate completely independently (no shared selection, sort, or saved preferences unless the same preference key is used deliberately).

**Interaction**

- Search or filter matches zero records → a "no matching results" message (distinct from "no data") with a "clear filters" action.
- Sorting a column with mixed types (numbers, text, empty) → deterministic order: numbers, then text, then empty values last; sorting is stable (equal values keep original relative order).
- Rapid repeated typing in search → results update after the user pauses briefly rather than on every keystroke.
- Page size changed while on a later page → the component keeps the first record previously visible on screen within view.
- Host-managed mode request fails → an error state with a retry action is shown; previously displayed data is kept visible where possible.
- Host-managed mode responses arriving out of order → stale responses are ignored.
- The component is removed from the page while a request is pending → no errors or warnings occur.

**Environment**

- Component is rendered on the server before reaching the browser → it produces meaningful initial output without errors and becomes interactive once loaded.
- Browser storage is unavailable or full when preference-saving is enabled → preferences silently fall back to in-memory only.
- Host application uses a different font size, zoom level (up to 200%), or high-contrast mode → content remains legible and usable.

## Requirements *(mandatory)*

### Functional Requirements

**Data input & rendering**

- **FR-001**: The component MUST accept the record collection through a single data property and render it without any other required configuration.
- **FR-002**: The component MUST derive fields automatically from the union of record fields when no field definitions are supplied, generating human-readable labels from field names.
- **FR-003**: The component MUST display common value types readably by default: text, numbers (locale-formatted), booleans (Yes/No or check indicator), dates (locale-formatted), and empty values (blank).
- **FR-004**: The component MUST handle all input-data edge cases listed above without crashing, and MUST emit developer-facing warnings for invalid input in development builds only.
- **FR-005**: The component MUST never modify the supplied data.
- **FR-006**: The component MUST render all record values as plain text unless the developer explicitly supplies custom display content.
- **FR-007**: The component MUST allow the developer to designate a unique identifier field for records.
- **FR-008**: The component MUST update its display when new data is supplied, re-applying current sort, filter, search, selection, and pagination state.

**Views**

- **FR-009**: The component MUST provide three views — table, grid (cards), and list — showing the same records and fields.
- **FR-010**: The component MUST provide a built-in view switcher, with developer control over the default view, the set of allowed views, and whether the switcher is shown.
- **FR-011**: The component MUST support both self-managed view state and host-controlled view state, notifying the host whenever the end user requests a view change.
- **FR-012**: The component MUST preserve sort, filter, search, selection, and page position when switching views.
- **FR-013**: Grid view MUST lay out cards responsively (number of columns adapts to available width, with developer-settable minimum card width) and MUST support a designated title field, optional image field, and optional custom card layout.
- **FR-014**: List view MUST show a primary line (title field) and secondary details per item and MUST support an optional custom item layout.

**Sorting, searching, filtering**

- **FR-015**: End users MUST be able to sort by any sortable field in ascending, descending, and original order, in all views.
- **FR-016**: Sorting MUST be stable, language-aware for text, type-aware for numbers/dates/booleans, and MUST place empty values last in both directions.
- **FR-017**: The developer MUST be able to enable multi-field sorting and supply a custom comparison for any field.
- **FR-018**: End users MUST be able to search across all visible fields with case- and accent-insensitive matching; the developer MUST be able to disable search or restrict it to certain fields.
- **FR-019**: End users MUST be able to filter per field with conditions appropriate to the field type: text (contains, equals, starts with, is empty), number (=, ≠, <, ≤, >, ≥, between), date (before, after, between), boolean (true/false), and pick-from-values for fields with a small set of distinct values.
- **FR-020**: The component MUST show the count of matching records when search or filters are active and MUST provide a single action to clear all conditions.
- **FR-021**: Sorting, filtering, and searching MUST operate on raw values, not formatted display values, unless the developer specifies otherwise.

**Pagination & scale**

- **FR-022**: The component MUST support paged display (with end-user-selectable page size from a developer-defined list; default 10/25/50/100) and continuous scrolling, selectable by the developer.
- **FR-023**: The component MUST remain responsive with at least 100,000 records supplied at once (see SC-003/SC-004).
- **FR-024**: The component MUST support a host-managed data mode in which the host supplies the current page and total count, and the component reports every change of page, page size, sort, filters, and search as one combined request.
- **FR-025**: In host-managed mode the component MUST show loading and error states, offer retry on error, and display only the response to the most recent request.

**Selection & interaction**

- **FR-026**: The component MUST support no selection, single selection, and multi-selection modes, configurable by the developer.
- **FR-027**: Multi-selection MUST support individual toggle, range selection, and "select all matching records" (across pages), and MUST display the selected count.
- **FR-028**: The component MUST notify the host of selection changes with the selected record identifiers and records, and MUST support host-controlled selection.
- **FR-029**: The developer MUST be able to mark individual records as not selectable.
- **FR-030**: The component MUST notify the host when a record is activated (click, tap, or Enter key) in any view.

**Customization**

- **FR-031**: The developer MUST be able to define fields: which appear, order, label, type, width (with min/max), alignment, visibility, sortability, filterability, searchability, value formatter, derived value, and custom display content.
- **FR-032**: The developer MUST be able to reference nested values by path (e.g., `address.city`).
- **FR-033**: The developer MUST be able to customize appearance through theme settings (colors, spacing, typography, border radius), density (compact/standard/comfortable), and light/dark modes, without overriding internal styles.
- **FR-034**: The developer MUST be able to replace built-in empty, no-results, loading, and error content.
- **FR-035**: All built-in text MUST be replaceable for localization, and number/date formatting MUST follow a developer-set locale (defaulting to the end user's browser locale).
- **FR-036**: The component MUST support right-to-left layouts.

**Column management & preferences**

- **FR-037**: In table view, end users MUST be able to resize, reorder, hide/show, and pin (left/right) columns, each of which the developer can disable.
- **FR-038**: Column visibility and order changes MUST apply consistently to grid and list views.
- **FR-039**: The developer MUST be able to enable preference-saving under a developer-supplied key, restoring view, column layout, sort, and page size; stale or invalid saved preferences MUST be ignored gracefully.
- **FR-040**: The component MUST report state changes (view, sort, filters, search, page, column layout) to the host so the host can store or synchronize them itself.

**Accessibility, responsiveness & packaging**

- **FR-041**: All features MUST be fully operable by keyboard, with visible focus indication and arrow-key navigation between cells, cards, and list items.
- **FR-042**: The component MUST expose correct roles, labels, and states to assistive technologies and announce result-count changes after sort, filter, search, and paging.
- **FR-043**: The component MUST meet WCAG 2.2 Level AA for contrast, focus, and operability in its default themes.
- **FR-044**: The component MUST remain usable on viewports down to 360px wide and at 200% zoom.
- **FR-045**: The component MUST render meaningful initial output when rendered on the server and become interactive in the browser without errors.
- **FR-046**: The package MUST be installable from the public package registry, ship with type information for editor autocompletion, and include usage documentation with runnable examples for each view.
- **FR-047**: Multiple instances of the component on one page MUST operate independently.

**Playground (preview app)**

- **FR-048**: The project MUST include a Playground web app, kept alongside the package, that renders the component using the package's current source through its public entry point only.
- **FR-049**: The Playground MUST always load a fixed, built-in Sample Dataset of exactly 50 records by default, with identical content and order on every start.
- **FR-050**: The 50-record Sample Dataset MUST include at least one field of each supported type (text, number, currency-like number, boolean, date, image link, status with a small set of values, nested object) and a unique identifier field. It MUST also include a few realistic irregular values (empty values, long text, accented and non-Latin text, markup-like text) so that default behavior is visible without switching datasets.
- **FR-051**: The Playground MUST refresh automatically within 3 seconds when package source changes are saved, without a manual reload.
- **FR-052**: The Playground MUST provide a settings panel that controls every developer-configurable option listed in FR-009 to FR-047, and MUST show the component's notifications to the host (selection, activation, state changes, data requests) in an on-screen event log.
- **FR-053**: The Playground MUST offer built-in alternate scenarios (empty data, invalid input, edge-case records, 100,000 generated records, host-managed mode with simulated delay and failure) and a reset action back to the default 50 records.
- **FR-054**: The Playground MUST NOT be included in the published package.
- **FR-055**: The Playground MUST run locally on the maintainer's computer only (opened in a browser at a local address). Publishing it as a public website is out of scope for v1.

### Key Entities

- **Record**: A single item of the supplied data (e.g., one user, one product). Has arbitrary named fields; optionally a unique identifier field.
- **Data Set**: The ordered collection of records supplied by the developer. In host-managed mode, one page of records plus a total count.
- **Field (Column) Definition**: Describes how one field is presented and behaves: key/path, label, type, width, alignment, visibility, pinning, sort/filter/search options, formatter, derived value, custom display content.
- **View**: One of table, grid, or list; plus view-specific options (title field, image field, card/item layout, minimum card width).
- **View State**: The end user's current interaction state — active view, sort order(s), filters, search text, page and page size, selection, and column layout. Can be self-managed, host-controlled, or restored from saved preferences.
- **Filter Condition**: A field, an operator appropriate to its type, and one or two comparison values.
- **Selection**: The set of selected record identifiers, plus mode (none/single/multi).
- **Data Request** (host-managed mode): The combined page, page size, sort, filters, and search sent to the host when any of them changes.
- **Theme**: Visual settings — colors, spacing, typography, radius, density, light/dark mode.
- **Locale Settings**: Language for built-in text, number/date formatting locale, and text direction.
- **Sample Dataset**: The fixed set of 50 records the Playground always loads by default. It never changes between runs and covers every supported field type plus a few irregular values.
- **Playground Scenario**: A named, built-in data and configuration setup in the Playground (default 50 records, empty, invalid input, edge cases, 100,000 records, host-managed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer new to the package can install it and display their own data in the table view within 5 minutes, using only the data property and the quick-start documentation.
- **SC-002**: With 10,000 records, sorting, searching, filtering, and switching views each show updated results within 0.5 seconds on a mid-range laptop.
- **SC-003**: With 100,000 records, the initial display appears within 1.5 seconds and scrolling stays smooth (no visible stutter or blank regions lasting over 100 ms) on a mid-range laptop.
- **SC-004**: With 100,000 records, sorting and searching show results within 1.5 seconds.
- **SC-005**: 100% of the edge cases listed in this specification are covered by automated tests, and none causes a crash or an unhandled error.
- **SC-006**: 100% of end-user features can be completed using only a keyboard, and automated accessibility checks report zero WCAG 2.2 AA violations in the default light and dark themes.
- **SC-007**: All three views are fully usable on a 360px-wide screen with no horizontal page overflow outside the table's own scroll area.
- **SC-008**: The package adds no more than 60 KB (compressed) to a host application's download size, and adds no required third-party runtime dependencies other than React itself.
- **SC-009**: In usability testing, at least 90% of end users can switch views, sort, search, and select a record on the first attempt without instructions.
- **SC-010**: Every documented configuration option has at least one working example in the documentation.
- **SC-011**: A maintainer can start the Playground with one command and see the 50 sample records within 30 seconds on a fresh checkout (after dependencies are installed), and saved source changes appear in it within 3 seconds.
- **SC-012**: 100% of developer-configurable options can be switched from the Playground settings panel without editing code.

## Assumptions

- "Grid" means a card/tile layout, "table" means a rows-and-columns layout, and "list" means a vertically stacked item layout. Table is the default view.
- The package targets React applications using currently supported React major versions (18 and later) and evergreen desktop and mobile browsers (latest two versions of Chrome, Edge, Firefox, Safari). Internet Explorer is not supported.
- Version 1 is a read-only display component: inline editing, adding, and deleting records within the component are out of scope. The host application performs data changes and re-supplies the data.
- Out of scope for version 1: row grouping and aggregation (totals, subtotals), tree/hierarchical rows, master-detail expandable rows, built-in export to CSV/Excel/PDF, charting, and printing layouts. The selection and state notifications allow hosts to build these themselves.
- The component does not fetch data itself; in host-managed mode the host is responsible for retrieving data from its own sources. Authentication and data-access security remain the host application's responsibility.
- Preference-saving uses the end user's own browser storage only; nothing is sent to any external service. The package collects no telemetry.
- "Mid-range laptop" for performance targets means roughly a 4-core CPU with 8 GB RAM running a current browser.
- The package is published as `@atharvaits/react-data-grid` and the component is named `ReactDataGrid`; the CSS prefix is `aits-`.
- The Playground is a local development tool only. Developers evaluating the package rely on the README and documentation examples. A hosted public demo can be added in a later version without changing the Playground itself.
- The package will be released under an open-source license and published to the public package registry; the specific license will be chosen during planning.
