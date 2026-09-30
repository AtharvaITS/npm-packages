// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = [
  { name: 'Ada Lovelace', born: new Date(1815, 11, 10), score: 99 },
  { name: 'Alan Turing', born: new Date(1912, 5, 23), score: 97 },
];

describe('server rendering (FR-045)', () => {
  it('has no browser globals in this environment', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it.each(['table', 'grid', 'list'] as const)(
    'renders the %s view to a string with content',
    (view) => {
      const html = renderToString(<ReactDataGrid data={rows} defaultView={view} />);
      expect(html).toContain('Ada Lovelace');
      expect(html).toContain('aits-root');
    },
  );

  it('renders headers and the first row values in table view', () => {
    const html = renderToString(<ReactDataGrid data={rows} />);
    expect(html).toContain('Name');
    expect(html).toContain('Score');
    expect(html).toContain('99');
  });

  it('renders scroll mode, selection, persistence and server mode without throwing', () => {
    expect(() =>
      renderToString(
        <ReactDataGrid
          data={Array.from({ length: 1000 }, (_, i) => ({ i }))}
          pagination="scroll"
          selectionMode="multi"
          persistStateKey="ssr"
        />,
      ),
    ).not.toThrow();
    expect(() =>
      renderToString(
        <ReactDataGrid dataMode="server" fetchData={async () => ({ rows: [], totalCount: 0 })} />,
      ),
    ).not.toThrow();
  });

  it('renders the empty state', () => {
    expect(renderToString(<ReactDataGrid data={null} />)).toContain('No data to display');
  });
});
