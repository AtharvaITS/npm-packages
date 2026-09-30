import type { ReactDataGridProps } from '@atharvaits/react-data-grid';
import { edgeCaseRows, invalidItems } from './edge-cases';
import { generateEmployees, generateWide } from './generate';
import { sample50 } from './sample-50';

export type ScenarioId =
  | 'default-50'
  | 'empty'
  | 'null-data'
  | 'invalid-items'
  | 'edge-cases'
  | 'wide-120-cols'
  | 'large-100k'
  | 'server-mode';

export interface Scenario {
  id: ScenarioId;
  label: string;
  /** Lazily produced so large datasets are only generated when selected. */
  data(): unknown;
  /** Props this scenario needs in addition to the Playground defaults. */
  suggestedProps?: Partial<ReactDataGridProps<any>>;
  server?: boolean;
}

function memo<T>(fn: () => T): () => T {
  let value: T | undefined;
  let done = false;
  return () => {
    if (!done) {
      value = fn();
      done = true;
    }
    return value as T;
  };
}

export const DEFAULT_SCENARIO: ScenarioId = 'default-50';

export const scenarios: Scenario[] = [
  {
    id: 'default-50',
    label: 'Default: 50 sample records',
    data: () => sample50,
    suggestedProps: { getRowId: 'id' },
  },
  { id: 'empty', label: 'Empty array', data: () => [] },
  { id: 'null-data', label: 'data = null', data: () => null },
  {
    id: 'invalid-items',
    label: 'Invalid items (null, numbers, strings)',
    data: () => invalidItems,
    suggestedProps: { getRowId: 'id' },
  },
  {
    id: 'edge-cases',
    label: 'Edge-case values',
    data: () => edgeCaseRows,
    suggestedProps: { getRowId: 'id' },
  },
  {
    id: 'wide-120-cols',
    label: 'Wide: 30 rows × 120 fields',
    data: memo(() => generateWide(30, 120)),
    suggestedProps: { getRowId: 'id' },
  },
  {
    id: 'large-100k',
    label: 'Large: 100,000 generated rows',
    data: memo(() => generateEmployees(100_000)),
    suggestedProps: { getRowId: 'id', pagination: 'scroll', height: 600 },
  },
  {
    id: 'server-mode',
    label: 'Host-managed (server) mode',
    data: () => undefined,
    server: true,
    suggestedProps: { getRowId: 'id' },
  },
];

export function getScenario(id: ScenarioId): Scenario {
  return scenarios.find((s) => s.id === id) ?? scenarios[0]!;
}
