import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid, createColumns, defaultMessages, type Messages } from '../../src';

type Emp = {
  id: string;
  first: string;
  last: string;
  salary: number;
  active: boolean;
  secret: string;
};
const rows: Emp[] = [
  { id: 'a', first: 'Ada', last: 'Lovelace', salary: 1234, active: true, secret: 's1' },
  { id: 'b', first: 'Alan', last: 'Turing', salary: 99, active: false, secret: 's2' },
  { id: 'c', first: 'Grace', last: 'Hopper', salary: 5000, active: true, secret: 's3' },
];

const columns = createColumns<Emp>([
  { id: 'full', header: 'Full name', valueGetter: (r) => `${r.first} ${r.last}` },
  { field: 'salary', header: 'Pay', type: 'currency', formatOptions: { currency: 'USD' } },
  {
    field: 'active',
    header: 'Status',
    render: ({ value }) => <span data-testid="badge">{value ? 'ON' : 'OFF'}</span>,
  },
]);

describe('US6: customize columns, fields and appearance', () => {
  it.each(['table', 'grid', 'list'] as const)(
    '%s: only defined columns, in order, with labels and custom content (scenarios 1, 3)',
    (view) => {
      const { container } = render(
        <ReactDataGrid<Emp> data={rows} columns={columns} getRowId="id" defaultView={view} />,
      );
      expect(container.textContent).not.toContain('s1');
      expect(screen.getAllByTestId('badge').map((b) => b.textContent)).toEqual(['ON', 'OFF', 'ON']);
      expect(container.textContent).toContain('$1,234.00');
      if (view === 'table') {
        expect(screen.getAllByRole('columnheader').map((h) => h.getAttribute('title'))).toEqual([
          'Full name',
          'Pay',
          'Status',
        ]);
      } else {
        expect(container.textContent).toContain('Pay');
      }
    },
  );

  it('formats for display but sorts and filters on raw values (scenario 2)', () => {
    render(
      <ReactDataGrid<Emp>
        data={rows}
        columns={columns}
        defaultSort={[{ columnId: 'salary', direction: 'asc' }]}
        defaultFilters={[{ columnId: 'salary', operator: 'gte', value: 1000 }]}
      />,
    );
    const pays = Array.from(document.querySelectorAll('.aits-tbody .aits-row')).map(
      (r) => r.children[1]!.textContent,
    );
    expect(pays).toEqual(['$1,234.00', '$5,000.00']);
  });

  it('derived columns are sortable and searchable (scenario 4)', () => {
    render(<ReactDataGrid<Emp> data={rows} columns={columns} defaultSearch="turing" />);
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  it('uses renderCard and renderListItem (scenario 5)', () => {
    const { container, rerender } = render(
      <ReactDataGrid<Emp>
        data={rows}
        getRowId="id"
        defaultView="grid"
        renderCard={({ row, fields }) => (
          <div data-testid="custom-card">
            {row.first}:{fields.length}
          </div>
        )}
      />,
    );
    expect(screen.getAllByTestId('custom-card')[0]!.textContent).toBe('Ada:5');
    // The component still owns the wrapper (role, focus).
    expect(container.querySelector('.aits-card')).toHaveAttribute('role', 'gridcell');
    rerender(
      <ReactDataGrid<Emp>
        key="list"
        data={rows}
        getRowId="id"
        defaultView="list"
        renderListItem={({ row }) => <div data-testid="custom-item">{row.last}</div>}
      />,
    );
    expect(screen.getAllByTestId('custom-item').map((e) => e.textContent)).toEqual([
      'Lovelace',
      'Turing',
      'Hopper',
    ]);
  });

  it('applies theme tokens, density and color scheme (scenario 6)', () => {
    const { container } = render(
      <ReactDataGrid
        data={rows}
        theme={{
          colorScheme: 'dark',
          density: 'compact',
          tokens: { colorAccent: '#ff0000', radius: '2px' },
        }}
      />,
    );
    const root = container.querySelector('.aits-root') as HTMLElement;
    expect(root.style.getPropertyValue('--aits-color-accent')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--aits-radius')).toBe('2px');
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveAttribute('data-color-scheme', 'dark');
  });

  it('replaces every built-in string via messages (scenario 7)', () => {
    const fr: Messages = { ...defaultMessages };
    for (const key of Object.keys(fr) as (keyof Messages)[]) {
      const v = defaultMessages[key];
      if (typeof v === 'string') (fr as any)[key] = `FR:${key}`;
      else if (typeof v === 'function')
        (fr as any)[key] = (...args: unknown[]) => `FR:${key}(${args.join(',')})`;
    }
    const many = Array.from({ length: 30 }, (_, i) => ({ n: i }));
    const { container } = render(<ReactDataGrid data={many} messages={fr} selectionMode="multi" />);
    let text = (container.textContent ?? '').replace(/\([^)]*\)/g, ' ');
    const keys = Object.keys(defaultMessages).sort((a, b) => b.length - a.length);
    for (const key of keys) text = text.split(`FR:${key}`).join(' ');
    for (const english of [
      'Rows per page',
      'Filter',
      'Columns',
      'Table',
      'Grid',
      'List',
      'Search',
    ]) {
      expect(text).not.toContain(english);
    }
    expect(container.textContent).toContain('FR:rowsPerPage');
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'FR:searchPlaceholder');
    expect(container.querySelector('[aria-label="FR:viewSwitcherLabel"]')).not.toBeNull();
  });

  it('formats numbers with the given locale', () => {
    render(<ReactDataGrid data={[{ n: 1234567.5 }]} locale="de-DE" />);
    expect(screen.getByText('1.234.567,5')).toBeInTheDocument();
  });

  it('supports custom empty, no-results, loading and error content', () => {
    const { rerender } = render(<ReactDataGrid data={[]} emptyContent={<b>Nothing yet</b>} />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    rerender(
      <ReactDataGrid
        key="search"
        data={rows}
        defaultSearch="zzz"
        noResultsContent={({ clearFilters }) => (
          <button type="button" onClick={clearFilters}>
            Custom reset
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Custom reset' }));
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    rerender(
      <ReactDataGrid
        dataMode="server"
        onDataRequest={() => {}}
        data={rows}
        totalCount={3}
        loading
        error="x"
        loadingContent={<i>Custom loading</i>}
        errorContent={({ retry }) => (
          <button type="button" onClick={retry}>
            Custom retry
          </button>
        )}
      />,
    );
    expect(screen.getByText('Custom loading')).toBeInTheDocument();
    expect(
      within(screen.getByRole('alert')).getByRole('button', { name: 'Custom retry' }),
    ).toBeInTheDocument();
  });

  it('merges className, style and id onto the root', () => {
    const { container } = render(
      <ReactDataGrid data={rows} className="mine" id="grid1" style={{ maxWidth: 500 }} />,
    );
    const root = container.querySelector('.aits-root') as HTMLElement;
    expect(root).toHaveClass('mine');
    expect(root.id).toBe('grid1');
    expect(root.style.maxWidth).toBe('500px');
  });
});
