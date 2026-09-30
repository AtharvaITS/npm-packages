import { useMemo, useRef, useState } from 'react';
import {
  ReactDataGrid,
  type ReactDataGridProps,
  type CardContext,
  type ColumnDef,
  type RowId,
} from '@atharvaits/react-data-grid';
import { createFakeServer } from './data/fakeServer';
import { sample50, type Employee } from './data/sample-50';
import { DEFAULT_SCENARIO, getScenario, scenarios, type ScenarioId } from './data/scenarios';
import { EventLog } from './events/EventLog';
import { useEventLog } from './events/useEventLog';
import { employeeColumns } from './examples/columns';
import { EmployeeCard } from './examples/EmployeeCard';
import { EmployeeListItem } from './examples/EmployeeListItem';
import { messagesFr } from './examples/messages-fr';
import { SettingsPanel } from './settings/SettingsPanel';
import { useSettings } from './settings/useSettings';

type AnyRow = Record<string, unknown>;

function unionKeys(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const keys = new Set<string>();
  for (const row of data.slice(0, 200)) {
    if (row && typeof row === 'object' && !Array.isArray(row))
      Object.keys(row).forEach((k) => keys.add(k));
  }
  return Array.from(keys);
}

function parseSizes(text: string): number[] {
  const sizes = text
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return sizes.length > 0 ? Array.from(new Set(sizes)) : [10, 25, 50, 100];
}

export function App() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO);
  const [resetCount, setResetCount] = useState(0);
  const { settings: s, update, reset } = useSettings();
  const { entries, log, clear } = useEventLog();
  const [selection, setSelection] = useState<RowId[]>([]);
  const scenario = getScenario(scenarioId);
  const data = useMemo(() => scenario.data(), [scenario]);
  const isEmployeeData =
    scenarioId === 'default-50' || scenarioId === 'large-100k' || scenario.server;

  // Server simulation reads the latest settings through a ref.
  const serverOptions = useRef({ failEvery5th: s.failEvery5th, randomizeOrder: s.randomizeOrder });
  serverOptions.current = { failEvery5th: s.failEvery5th, randomizeOrder: s.randomizeOrder };
  const fetchData = useMemo(
    () =>
      createFakeServer(sample50, () => ({
        delayMs: 600,
        ...serverOptions.current,
        onRequest: (req) => log('fetchData', req),
      })),
    [log],
  );

  // Columns: custom definitions for employee data, otherwise derived keys; plus per-column flags.
  const columns = useMemo<ColumnDef<AnyRow>[] | undefined>(() => {
    const flagged = Object.keys(s.columnFlags).length > 0;
    let base: ColumnDef<AnyRow>[] | undefined;
    if (s.useCustomColumns && isEmployeeData) {
      base = employeeColumns({
        statusBadge: s.customStatusBadge,
      }) as unknown as ColumnDef<AnyRow>[];
    } else if (s.customStatusBadge && isEmployeeData) {
      base = unionKeys(scenario.server ? sample50 : data).map((field) =>
        field === 'active'
          ? (employeeColumns({ statusBadge: true }).find(
              (c) => c.field === 'active',
            ) as unknown as ColumnDef<AnyRow>)
          : { field },
      );
    } else if (flagged) {
      base = unionKeys(scenario.server ? sample50 : data).map((field) => ({ field }));
    }
    if (!base || !flagged) return base;
    return base.map((c) => {
      const id = c.id ?? c.field ?? '';
      const f = s.columnFlags[id];
      return f ? { ...c, ...f } : c;
    });
  }, [
    s.useCustomColumns,
    s.customStatusBadge,
    s.columnFlags,
    isEmployeeData,
    scenario.server,
    data,
  ]);

  const columnIds = useMemo(
    () =>
      columns
        ? columns.map((c) => c.id ?? c.field ?? '')
        : unionKeys(scenario.server ? sample50 : data),
    [columns, data, scenario.server],
  );

  const pageSizeOptions = useMemo(() => parseSizes(s.pageSizeOptions), [s.pageSizeOptions]);
  const suggested = scenario.suggestedProps ?? {};

  const props: ReactDataGridProps<AnyRow> = {
    ...(suggested as ReactDataGridProps<AnyRow>),
    'aria-label': 'Employees',
    columns,
    // View
    defaultView: s.defaultView,
    views: s.views,
    showViewSwitcher: s.showViewSwitcher,
    titleField: s.titleField || undefined,
    subtitleField: s.subtitleField || undefined,
    imageField: s.imageField || undefined,
    cardMinWidth: s.cardMinWidth,
    cardFieldLimit: s.cardFieldLimit,
    renderCard:
      s.customCard && isEmployeeData
        ? (ctx) => <EmployeeCard {...(ctx as unknown as CardContext<Employee>)} />
        : undefined,
    renderListItem:
      s.customListItem && isEmployeeData
        ? (ctx) => <EmployeeListItem {...(ctx as unknown as CardContext<Employee>)} />
        : undefined,
    // Sort / search / filter
    multiSort: s.multiSort,
    searchable: s.searchable,
    filterable: s.filterable,
    searchDebounceMs: s.searchDebounceMs,
    // Paging
    pagination: scenarioId === 'large-100k' && s.pagination === 'pages' ? 'scroll' : s.pagination,
    defaultPageSize: pageSizeOptions.includes(s.defaultPageSize)
      ? s.defaultPageSize
      : pageSizeOptions[0],
    pageSizeOptions,
    height: s.height,
    // Selection
    selectionMode: s.selectionMode,
    isRowSelectable: s.every7thUnselectable
      ? (row) => {
          const id = String((row as AnyRow).id ?? '');
          const n = Number(id.replace(/\D/g, ''));
          return !(Number.isFinite(n) && n > 0 && n % 7 === 0);
        }
      : undefined,
    ...(s.controlledSelection ? { selection } : {}),
    // Columns
    enableColumnResize: s.enableColumnResize,
    enableColumnReorder: s.enableColumnReorder,
    enableColumnHide: s.enableColumnHide,
    enableColumnPin: s.enableColumnPin,
    persistStateKey: s.persistStateKey || undefined,
    // Theme / locale
    theme: {
      colorScheme: s.colorScheme,
      density: s.density,
      tokens: {
        ...(s.accent ? { colorAccent: s.accent, colorFocusRing: s.accent } : {}),
        radius: `${s.radius}px`,
      },
    },
    locale: s.locale || undefined,
    direction: s.direction,
    messages: s.frenchMessages ? messagesFr : undefined,
    emptyContent: s.customEmptyContent ? (
      <p>🗂️ Nothing here yet — add some employees.</p>
    ) : undefined,
    noResultsContent: s.customEmptyContent
      ? ({ clearFilters }) => (
          <p>
            No employees match.{' '}
            <button type="button" className="pg-button" onClick={clearFilters}>
              Reset
            </button>
          </p>
        )
      : undefined,
    loadingContent: s.customErrorContent ? <span>⏳ Fetching employees…</span> : undefined,
    errorContent: s.customErrorContent
      ? ({ retry, error }) => (
          <span>
            ⚠️ {error instanceof Error ? error.message : 'Failed'}{' '}
            <button type="button" className="pg-button" onClick={retry}>
              Try again
            </button>
          </span>
        )
      : undefined,
    // Events
    onViewChange: (v) => log('onViewChange', v),
    onSortChange: (v) => log('onSortChange', v),
    onSearchChange: (v) => log('onSearchChange', v),
    onFiltersChange: (v) => log('onFiltersChange', v),
    onPageChange: (v) => log('onPageChange', v),
    onPageSizeChange: (v) => log('onPageSizeChange', v),
    onSelectionChange: (ids) => {
      if (s.controlledSelection) setSelection(ids);
      log('onSelectionChange', ids);
    },
    onRowActivate: (row, id) => log('onRowActivate', { id, name: (row as Partial<Employee>).name }),
    onColumnStateChange: (v) => log('onColumnStateChange', v),
    onStateChange: (_state, changed) => log('onStateChange', changed),
  };

  if (scenario.server) {
    props.dataMode = 'server';
    props.fetchData = fetchData as unknown as ReactDataGridProps<AnyRow>['fetchData'];
    props.columns =
      columns ?? (unionKeys(sample50).map((field) => ({ field })) as ColumnDef<AnyRow>[]);
  } else {
    props.data = data as AnyRow[] | null;
  }

  // Remount when mount-only settings change so defaults take effect.
  const gridKey = [
    scenarioId,
    resetCount,
    s.defaultView,
    s.defaultPageSize,
    s.persistStateKey,
    s.controlledSelection,
  ].join('|');

  return (
    <div className="pg-app">
      <header className="pg-header">
        <h1>ReactDataGrid Playground</h1>
        <div className="pg-header-controls">
          <label className="pg-field pg-field-inline">
            <span>Scenario</span>
            <select
              value={scenarioId}
              onChange={(e) => {
                setScenarioId(e.target.value as ScenarioId);
                setSelection([]);
                log('scenario', e.target.value);
              }}
              data-testid="scenario-select"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pg-button"
            onClick={() => {
              setScenarioId(DEFAULT_SCENARIO);
              reset();
              setSelection([]);
              setResetCount((n) => n + 1);
              log('reset');
            }}
          >
            Reset
          </button>
        </div>
      </header>
      <div className="pg-main">
        <main className="pg-preview" aria-label="Preview">
          <ReactDataGrid key={gridKey} {...props} />
        </main>
        <SettingsPanel
          settings={s}
          update={update}
          columnIds={columnIds}
          serverScenario={!!scenario.server}
          onClearSavedState={() => {
            try {
              localStorage.removeItem('@atharvaits/react-data-grid:' + s.persistStateKey);
            } catch {
              // storage unavailable
            }
            setResetCount((n) => n + 1);
            log('clearSavedState', s.persistStateKey);
          }}
        />
      </div>
      <EventLog entries={entries} onClear={clear} />
    </div>
  );
}
