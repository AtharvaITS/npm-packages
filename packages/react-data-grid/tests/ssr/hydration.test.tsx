// @vitest-environment jsdom
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid, type ReactDataGridProps } from '../../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver ??= RO;

const rows = Array.from({ length: 40 }, (_, i) => ({
  id: `r${i}`,
  name: `Name ${i}`,
  n: i,
  when: new Date(2020, 0, 1 + i),
}));

const cases: [string, ReactDataGridProps<any>][] = [
  ['table', { data: rows, getRowId: 'id' }],
  ['grid', { data: rows, getRowId: 'id', defaultView: 'grid' }],
  ['list', { data: rows, getRowId: 'id', defaultView: 'list', selectionMode: 'multi' }],
  ['scroll', { data: rows, getRowId: 'id', pagination: 'scroll', height: 400 }],
  [
    'server mode',
    { dataMode: 'server', fetchData: async () => ({ rows: rows.slice(0, 25), totalCount: 40 }) },
  ],
  ['persistence', { data: rows, getRowId: 'id', persistStateKey: 'hydrate' }],
];

describe('hydration (FR-045)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it.each(cases)('%s hydrates without mismatch warnings', async (_name, props) => {
    // Saved preferences exist in the browser but must not change the first client render.
    localStorage.setItem(
      '@atharvaits/react-data-grid:hydrate',
      JSON.stringify({ v: 1, view: 'list', sort: [], pageSize: 10, columns: [] }),
    );
    const html = renderToString(<ReactDataGrid {...props} />);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args) =>
      errors.push(args.map(String).join(' ')),
    );
    const recoverable: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <ReactDataGrid {...props} />, {
        onRecoverableError: (e) => recoverable.push(e),
      });
    });
    expect(recoverable).toEqual([]);
    expect(errors.filter((e) => /hydrat|did not match/i.test(e))).toEqual([]);
  });
});
