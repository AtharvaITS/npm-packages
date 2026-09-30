import { useMemo, useState } from 'react';
import {
  ReactDataGrid,
  type ColumnDef,
  type ReactDataGridProps,
} from '@atharvaits/react-data-grid';
import { createFakeServer } from './data/fakeServer';
import { sample50 } from './data/sample-50';
import { DEFAULT_SCENARIO, getScenario, scenarios, type ScenarioId } from './data/scenarios';

type AnyRow = Record<string, unknown>;

/** The fixed grid configuration: the component's full feature set switched on. */
const PLAYGROUND_PROPS: ReactDataGridProps<AnyRow> = {
  'aria-label': 'Employees',
  defaultView: 'table',
  views: ['table', 'grid', 'list'],
  showViewSwitcher: true,
  multiSort: false,
  searchable: true,
  filterable: true,
  pagination: 'pages',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  height: 600,
  selectionMode: 'none',
  enableColumnResize: true,
  enableColumnReorder: true,
  enableColumnHide: true,
  enableColumnPin: true,
  theme: { colorScheme: 'auto', density: 'standard', tokens: { radius: '8px' } },
  direction: 'auto',
};

/** Shows `{ city, country }` as "City, Country" instead of the default key summary. */
function formatAddress(value: unknown): string {
  const { city, country } = (value ?? {}) as { city?: unknown; country?: unknown };
  return [city, country].filter(Boolean).join(', ');
}

function buildColumns(row: object | undefined): ColumnDef<AnyRow>[] {
  return Object.keys(row ?? {}).map((field) =>
    field === 'address' ? { field, format: formatAddress } : { field },
  );
}

const SERVER_COLUMNS = buildColumns(sample50[0]);

const fetchData = createFakeServer(sample50, () => ({ delayMs: 600 }));

export function App() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO);
  const [resetCount, setResetCount] = useState(0);
  const scenario = getScenario(scenarioId);
  const data = useMemo(() => scenario.data(), [scenario]);

  const props: ReactDataGridProps<AnyRow> = {
    ...PLAYGROUND_PROPS,
    ...(scenario.suggestedProps as ReactDataGridProps<AnyRow> | undefined),
  };
  if (scenario.server) {
    props.dataMode = 'server';
    props.fetchData = fetchData as unknown as ReactDataGridProps<AnyRow>['fetchData'];
    props.columns = SERVER_COLUMNS;
  } else {
    props.data = data as AnyRow[] | null;
    const first = (data as AnyRow[] | null)?.[0];
    if (first && 'address' in first) props.columns = buildColumns(first);
  }

  return (
    <div className="pg-app">
      <header className="pg-header">
        <h1>ReactDataGrid Playground</h1>
        <div className="pg-header-controls">
          <label className="pg-field pg-field-inline">
            <span>Scenario</span>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value as ScenarioId)}
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
              setResetCount((n) => n + 1);
            }}
          >
            Reset
          </button>
        </div>
      </header>
      <main className="pg-preview" aria-label="Preview">
        <ReactDataGrid key={`${scenarioId}|${resetCount}`} {...props} />
      </main>
    </div>
  );
}
