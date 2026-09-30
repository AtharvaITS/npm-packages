import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = [
  { id: 1, name: 'John Smith', salary: 5000, start: new Date(2020, 0, 10) },
  { id: 2, name: 'José Álvarez', salary: null, start: new Date(2021, 5, 1) },
  { id: 3, name: 'Ann Smithers', salary: 7000, start: new Date(2019, 3, 3) },
  { id: 4, name: 'Bea Jones', salary: 6000, start: new Date(2022, 8, 9) },
];

const names = () =>
  Array.from(document.querySelectorAll('.aits-tbody .aits-row')).map(
    (r) => r.querySelectorAll('.aits-cell')[1]!.textContent,
  );

describe('US3: sort, search and filter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cycles asc → desc → original with correct aria-sort and empties last (scenarios 1–2)', () => {
    render(<ReactDataGrid data={rows} getRowId="id" />);
    const header = screen.getByRole('columnheader', { name: /Salary/ });
    const button = within(header).getByRole('button', { name: 'Salary' });
    fireEvent.click(button);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['John Smith', 'Bea Jones', 'Ann Smithers', 'José Álvarez']);
    fireEvent.click(button);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(names()).toEqual(['Ann Smithers', 'Bea Jones', 'John Smith', 'José Álvarez']);
    fireEvent.click(button);
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(names()).toEqual(rows.map((r) => r.name));
  });

  it('searches after the debounce and shows the result count (scenario 4)', async () => {
    const onSearchChange = vi.fn();
    render(<ReactDataGrid data={rows} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SMITH' } });
    expect(onSearchChange).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearchChange).toHaveBeenCalledWith('SMITH');
    expect(names()).toEqual(['John Smith', 'Ann Smithers']);
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  it('search is accent-insensitive', async () => {
    render(<ReactDataGrid data={rows} searchDebounceMs={0} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jose alvarez' } });
    expect(names()).toEqual(['José Álvarez']);
  });

  it('filters dates with an inclusive "between" (scenario 5) and clears all (scenario 6)', () => {
    render(
      <ReactDataGrid
        data={rows}
        defaultFilters={[
          { columnId: 'start', operator: 'between', value: '2019-04-03', value2: '2020-01-10' },
        ]}
      />,
    );
    expect(names()).toEqual(['John Smith', 'Ann Smithers']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(names()).toHaveLength(4);
  });

  it('combines search and filters with AND (scenario 6)', () => {
    render(
      <ReactDataGrid
        data={rows}
        defaultSearch="smith"
        defaultFilters={[{ columnId: 'salary', operator: 'gt', value: 6000 }]}
      />,
    );
    expect(names()).toEqual(['Ann Smithers']);
  });

  it('adds a filter through the filter panel', () => {
    render(<ReactDataGrid data={rows} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add filter' }));
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Column' }), {
      target: { value: 'name' },
    });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Condition' }), {
      target: { value: 'startsWith' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Value' }), {
      target: { value: 'b' },
    });
    expect(names()).toEqual(['Bea Jones']);
    expect(
      screen.getByRole('button', { name: /Remove filter: Name starts with b/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports multi-column sort with Shift (scenario 7)', () => {
    const data = [
      { g: 'b', n: 2 },
      { g: 'a', n: 2 },
      { g: 'a', n: 1 },
    ];
    render(<ReactDataGrid data={data} multiSort />);
    fireEvent.click(screen.getByRole('button', { name: 'G' }));
    fireEvent.click(screen.getByRole('button', { name: 'N' }), { shiftKey: true });
    const cells = Array.from(document.querySelectorAll('.aits-tbody .aits-row')).map(
      (r) => r.textContent,
    );
    expect(cells).toEqual(['a1', 'a2', 'b2']);
  });

  it('offers no controls for non-sortable / non-filterable columns (scenario 8)', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'name', sortable: false, filterable: false }, { field: 'salary' }]}
      />,
    );
    const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
    expect(nameHeader).not.toHaveAttribute('aria-sort');
    expect(within(nameHeader).queryByRole('button', { name: 'Name' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    const options = within(screen.getByRole('combobox', { name: 'Column' })).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Salary']);
  });

  it('resets to page 1 when search or filters change', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ n: i, t: i % 2 ? 'odd' : 'even' }));
    render(<ReactDataGrid data={many} searchDebounceMs={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('26–50 of 60')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'odd' } });
    expect(screen.getByText('1–25 of 30')).toBeInTheDocument();
  });

  it('announces the new result count', async () => {
    render(<ReactDataGrid data={rows} searchDebounceMs={0} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'smith' } });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('status').textContent).toContain('2 results');
  });

  it('shows a no-results state distinct from the empty state', () => {
    render(<ReactDataGrid data={rows} defaultSearch="zzz" />);
    expect(screen.getByText('No matching results')).toBeInTheDocument();
    expect(screen.queryByText('No data to display')).not.toBeInTheDocument();
  });

  it('grid and list views use the sort menu with the same sort state', () => {
    render(<ReactDataGrid data={rows} defaultView="list" titleField="name" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'salary' },
    });
    const primary = Array.from(document.querySelectorAll('.aits-list-primary')).map(
      (e) => e.textContent,
    );
    expect(primary).toEqual(['John Smith', 'Bea Jones', 'Ann Smithers', 'José Álvarez']);
  });
});
