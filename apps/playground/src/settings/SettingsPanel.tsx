/*
 * Settings panel coverage (SC-012): every public prop except `data`, `fetchData`
 * and the render functions has a control here. Prop → control:
 *
 *   getRowId ............... fixed per scenario ("id")      columns ............. Columns › Use custom column definitions
 *   dataMode / onDataRequest  Scenario "Host-managed"        totalCount/loading/error  Scenario "Host-managed" (fetchData form)
 *   onRetry ................ Scenario "Host-managed" › fail every 5th request (Retry button)
 *   view/defaultView ....... View › Default view            onViewChange ........ Event log
 *   views .................. View › Allowed views           showViewSwitcher .... View › Show view switcher
 *   titleField/subtitleField/imageField .. View › Title/Subtitle/Image field
 *   cardMinWidth ........... View › Card min width          cardFieldLimit ...... View › Card field limit
 *   renderCard ............. Columns › Custom card          renderListItem ...... Columns › Custom list item
 *   sort/defaultSort/onSortChange ........ table headers + Event log;  multiSort .. Sort › Multi-column sort
 *   search/defaultSearch/onSearchChange .. toolbar search + Event log; searchable . Filter › Show search
 *   searchDebounceMs ....... Filter › Search debounce       filters/defaultFilters/onFiltersChange . toolbar + Event log
 *   filterable ............. Filter › Show filters          per-column sortable/filterable/searchable . Sort › Column flags
 *   pagination ............. Paging › Mode                  page/defaultPage/onPageChange .......... pager + Event log
 *   pageSize/defaultPageSize/onPageSizeChange .. Paging › Default page size;  pageSizeOptions . Paging › Page size options
 *   height ................. Paging › Height (scroll)
 *   selectionMode .......... Selection › Mode              selection/defaultSelection ... Selection › Controlled selection
 *   onSelectionChange ...... Event log                      isRowSelectable ..... Selection › Every 7th row not selectable
 *   onRowActivate .......... Event log
 *   columnState/defaultColumnState/onColumnStateChange ... header menus/resizing + Event log
 *   enableColumnResize/Reorder/Hide/Pin .. Columns › Enable …
 *   persistStateKey ........ Persistence › Key (+ clear saved state)   onStateChange ....... Event log
 *   theme (colorScheme, density, tokens) . Theme › …        locale .............. Locale › Locale
 *   direction .............. Locale › Direction             messages ............ Locale › French messages
 *   emptyContent/noResultsContent ........ States › Custom empty content
 *   loadingContent/errorContent .......... States › Custom error content
 *   className/style/id/aria-label ........ fixed in App (aria-label="Employees")
 */
import type { ReactNode } from 'react';
import type { ViewType } from '@atharvaits/react-data-grid';
import type { Settings } from './useSettings';

type Update = <K extends keyof Settings>(key: K, value: Settings[K]) => void;

function Section({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="pg-group" open={open}>
      <summary>{title}</summary>
      <div className="pg-group-body">{children}</div>
    </details>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  return (
    <label className="pg-field pg-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: (T | [T, string])[];
  onChange(v: T): void;
}) {
  return (
    <label className="pg-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="pg-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  placeholder?: string;
}) {
  return (
    <label className="pg-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

const VIEWS: ViewType[] = ['table', 'grid', 'list'];

export function SettingsPanel({
  settings: s,
  update,
  columnIds,
  serverScenario,
  onClearSavedState,
}: {
  settings: Settings;
  update: Update;
  columnIds: string[];
  serverScenario: boolean;
  onClearSavedState(): void;
}) {
  const fieldOptions: [string, string][] = [
    ['', '(default)'],
    ...columnIds.map((id): [string, string] => [id, id]),
  ];
  const flagTarget = s.columnFlagsTarget || columnIds[0] || '';
  const flags = s.columnFlags[flagTarget] ?? { sortable: true, filterable: true, searchable: true };
  const setFlag = (key: 'sortable' | 'filterable' | 'searchable', value: boolean) =>
    update('columnFlags', { ...s.columnFlags, [flagTarget]: { ...flags, [key]: value } });

  return (
    <aside className="pg-settings" aria-labelledby="pg-settings-title">
      <h2 id="pg-settings-title">Settings</h2>

      <Section title="View" open>
        <Select
          label="Default view"
          value={s.defaultView}
          options={VIEWS}
          onChange={(v) => update('defaultView', v)}
        />
        <fieldset className="pg-fieldset">
          <legend>Allowed views</legend>
          {VIEWS.map((v) => (
            <Check
              key={v}
              label={v}
              checked={s.views.includes(v)}
              onChange={(on) =>
                update(
                  'views',
                  on
                    ? VIEWS.filter((x) => x === v || s.views.includes(x))
                    : s.views.filter((x) => x !== v),
                )
              }
            />
          ))}
        </fieldset>
        <Check
          label="Show view switcher"
          checked={s.showViewSwitcher}
          onChange={(v) => update('showViewSwitcher', v)}
        />
        <Select
          label="Title field"
          value={s.titleField}
          options={fieldOptions}
          onChange={(v) => update('titleField', v)}
        />
        <Select
          label="Subtitle field"
          value={s.subtitleField}
          options={fieldOptions}
          onChange={(v) => update('subtitleField', v)}
        />
        <Select
          label="Image field"
          value={s.imageField}
          options={fieldOptions}
          onChange={(v) => update('imageField', v)}
        />
        <NumberInput
          label="Card min width (px)"
          value={s.cardMinWidth}
          min={120}
          max={600}
          step={10}
          onChange={(v) => update('cardMinWidth', v)}
        />
        <NumberInput
          label="Card field limit"
          value={s.cardFieldLimit}
          min={0}
          max={20}
          onChange={(v) => update('cardFieldLimit', v)}
        />
      </Section>

      <Section title="Sort">
        <Check
          label="Multi-column sort (Shift+click)"
          checked={s.multiSort}
          onChange={(v) => update('multiSort', v)}
        />
        <Select
          label="Column flags for"
          value={flagTarget}
          options={columnIds}
          onChange={(v) => update('columnFlagsTarget', v)}
        />
        <Check label="sortable" checked={flags.sortable} onChange={(v) => setFlag('sortable', v)} />
        <Check
          label="filterable"
          checked={flags.filterable}
          onChange={(v) => setFlag('filterable', v)}
        />
        <Check
          label="searchable"
          checked={flags.searchable}
          onChange={(v) => setFlag('searchable', v)}
        />
      </Section>

      <Section title="Filter & search">
        <Check
          label="Show search"
          checked={s.searchable}
          onChange={(v) => update('searchable', v)}
        />
        <Check
          label="Show filters"
          checked={s.filterable}
          onChange={(v) => update('filterable', v)}
        />
        <NumberInput
          label="Search debounce (ms)"
          value={s.searchDebounceMs}
          min={0}
          max={2000}
          step={50}
          onChange={(v) => update('searchDebounceMs', v)}
        />
      </Section>

      <Section title="Paging">
        <Select
          label="Mode"
          value={s.pagination}
          options={[
            ['pages', 'Pages'],
            ['scroll', 'Continuous scroll'],
          ]}
          onChange={(v) => update('pagination', v)}
        />
        <NumberInput
          label="Default page size"
          value={s.defaultPageSize}
          min={1}
          max={1000}
          onChange={(v) => update('defaultPageSize', v)}
        />
        <Text
          label="Page size options"
          value={s.pageSizeOptions}
          onChange={(v) => update('pageSizeOptions', v)}
        />
        <NumberInput
          label="Height (scroll mode, px)"
          value={s.height}
          min={200}
          max={2000}
          step={50}
          onChange={(v) => update('height', v)}
        />
      </Section>

      <Section title="Selection">
        <Select
          label="Mode"
          value={s.selectionMode}
          options={[
            ['none', 'None'],
            ['single', 'Single'],
            ['multi', 'Multiple'],
          ]}
          onChange={(v) => update('selectionMode', v)}
        />
        <Check
          label="Every 7th row not selectable"
          checked={s.every7thUnselectable}
          onChange={(v) => update('every7thUnselectable', v)}
        />
        <Check
          label="Controlled selection (host state)"
          checked={s.controlledSelection}
          onChange={(v) => update('controlledSelection', v)}
        />
      </Section>

      <Section title="Columns">
        <Check
          label="Use custom column definitions"
          checked={s.useCustomColumns}
          onChange={(v) => update('useCustomColumns', v)}
        />
        <Check
          label="Custom status badge (render)"
          checked={s.customStatusBadge}
          onChange={(v) => update('customStatusBadge', v)}
        />
        <Check
          label="Custom card (renderCard)"
          checked={s.customCard}
          onChange={(v) => update('customCard', v)}
        />
        <Check
          label="Custom list item (renderListItem)"
          checked={s.customListItem}
          onChange={(v) => update('customListItem', v)}
        />
        <Check
          label="Enable column resize"
          checked={s.enableColumnResize}
          onChange={(v) => update('enableColumnResize', v)}
        />
        <Check
          label="Enable column reorder"
          checked={s.enableColumnReorder}
          onChange={(v) => update('enableColumnReorder', v)}
        />
        <Check
          label="Enable column hide"
          checked={s.enableColumnHide}
          onChange={(v) => update('enableColumnHide', v)}
        />
        <Check
          label="Enable column pin"
          checked={s.enableColumnPin}
          onChange={(v) => update('enableColumnPin', v)}
        />
      </Section>

      <Section title="Theme">
        <Select
          label="Color scheme"
          value={s.colorScheme}
          options={['auto', 'light', 'dark']}
          onChange={(v) => update('colorScheme', v)}
        />
        <Select
          label="Density"
          value={s.density}
          options={['compact', 'standard', 'comfortable']}
          onChange={(v) => update('density', v)}
        />
        <label className="pg-field">
          <span>Accent color</span>
          <span className="pg-inline">
            <input
              type="color"
              value={s.accent || '#2453c9'}
              onChange={(e) => update('accent', e.target.value)}
            />
            <button
              type="button"
              className="pg-button"
              onClick={() => update('accent', '')}
              disabled={!s.accent}
            >
              Default
            </button>
          </span>
        </label>
        <NumberInput
          label="Corner radius (px)"
          value={s.radius}
          min={0}
          max={24}
          onChange={(v) => update('radius', v)}
        />
      </Section>

      <Section title="Locale">
        <Select
          label="Locale"
          value={s.locale}
          options={[['', 'Browser default'], 'en-US', 'de-DE', 'fr-FR', 'ar-EG', 'ja-JP']}
          onChange={(v) => update('locale', v)}
        />
        <Select
          label="Direction"
          value={s.direction}
          options={['auto', 'ltr', 'rtl']}
          onChange={(v) => update('direction', v)}
        />
        <Check
          label="French messages"
          checked={s.frenchMessages}
          onChange={(v) => update('frenchMessages', v)}
        />
      </Section>

      <Section title="States">
        <Check
          label="Custom empty / no-results content"
          checked={s.customEmptyContent}
          onChange={(v) => update('customEmptyContent', v)}
        />
        <Check
          label="Custom loading / error content"
          checked={s.customErrorContent}
          onChange={(v) => update('customErrorContent', v)}
        />
      </Section>

      <Section title="Persistence">
        <Text
          label="persistStateKey"
          value={s.persistStateKey}
          placeholder="e.g. employees"
          onChange={(v) => update('persistStateKey', v.trim())}
        />
        <button
          type="button"
          className="pg-button"
          onClick={onClearSavedState}
          disabled={!s.persistStateKey}
        >
          Clear saved state
        </button>
      </Section>

      {serverScenario && (
        <Section title="Server simulation" open>
          <Check
            label="Fail every 5th request"
            checked={s.failEvery5th}
            onChange={(v) => update('failEvery5th', v)}
          />
          <Check
            label="Randomize response order (100–1200 ms)"
            checked={s.randomizeOrder}
            onChange={(v) => update('randomizeOrder', v)}
          />
        </Section>
      )}
    </aside>
  );
}
