import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

const people = [
  { name: 'Ada Lovelace', role: 'Mathematician', city: 'London', born: 1815 },
  { name: 'Alan Turing', role: 'Computer Scientist', city: 'Wilmslow', born: 1912 },
  { name: 'Grace Hopper', role: 'Rear Admiral', city: 'New York', born: 1906 },
];

const switcher = () => screen.getByRole('radiogroup', { name: 'View' });

describe('US2: switch between table, grid and list views', () => {
  afterEach(() => vi.restoreAllMocks());

  it('grid view shows cards with a title and labelled fields (scenario 1)', () => {
    const { container } = render(<ReactDataGrid data={people} />);
    fireEvent.click(within(switcher()).getByRole('radio', { name: 'Grid' }));
    const cards = container.querySelectorAll('.aits-card');
    expect(cards).toHaveLength(3);
    const first = cards[0] as HTMLElement;
    expect(first.querySelector('.aits-card-title')!.textContent).toBe('Ada Lovelace');
    expect(within(first).getByText('Role')).toBeInTheDocument();
    expect(within(first).getByText('Mathematician')).toBeInTheDocument();
  });

  it('list view shows primary and secondary lines (scenario 2)', () => {
    const { container } = render(<ReactDataGrid data={people} defaultView="list" />);
    const items = container.querySelectorAll('.aits-list-item');
    expect(items).toHaveLength(3);
    expect(items[1]!.querySelector('.aits-list-primary')!.textContent).toBe('Alan Turing');
    expect(items[1]!.querySelector('.aits-list-secondary')!.textContent).toBe('Computer Scientist');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('only offers allowed views and hides the switcher for a single view (scenario 4)', () => {
    const { unmount } = render(<ReactDataGrid data={people} views={['table', 'list']} />);
    expect(within(switcher()).getAllByRole('radio')).toHaveLength(2);
    unmount();
    const { container } = render(<ReactDataGrid data={people} views={['grid']} />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.aits-card')).toHaveLength(3);
  });

  it('honors defaultView (scenario 5)', () => {
    const { container } = render(<ReactDataGrid data={people} defaultView="grid" />);
    expect(container.querySelector('.aits-root')!.getAttribute('data-view')).toBe('grid');
    expect(within(switcher()).getByRole('radio', { name: 'Grid' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('controlled view only changes when the host updates the prop (scenario 6)', () => {
    const onViewChange = vi.fn();
    const { container, rerender } = render(
      <ReactDataGrid data={people} view="table" onViewChange={onViewChange} />,
    );
    fireEvent.click(within(switcher()).getByRole('radio', { name: 'List' }));
    expect(onViewChange).toHaveBeenCalledWith('list');
    expect(container.querySelector('.aits-root')!.getAttribute('data-view')).toBe('table');
    rerender(<ReactDataGrid data={people} view="list" onViewChange={onViewChange} />);
    expect(container.querySelector('.aits-root')!.getAttribute('data-view')).toBe('list');
  });

  it('uses the first visible column as title when none is given (scenario 7)', () => {
    const { container } = render(
      <ReactDataGrid data={[{ z: 'first', a: 'second' }]} defaultView="grid" />,
    );
    expect(container.querySelector('.aits-card-title')!.textContent).toBe('first');
  });

  it('honors titleField, subtitleField and cardFieldLimit', () => {
    const { container } = render(
      <ReactDataGrid
        data={people}
        defaultView="list"
        titleField="city"
        subtitleField="name"
        cardFieldLimit={1}
      />,
    );
    const item = container.querySelector('.aits-list-item')!;
    expect(item.querySelector('.aits-list-primary')!.textContent).toBe('London');
    expect(item.querySelector('.aits-list-secondary')!.textContent).toBe('Ada Lovelace');
    expect(item.querySelectorAll('.aits-list-meta-item')).toHaveLength(1);
  });

  it('falls back to the first allowed view with a warning when view is not allowed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <ReactDataGrid data={people} views={['grid', 'list']} view="table" />,
    );
    expect(container.querySelector('.aits-root')!.getAttribute('data-view')).toBe('grid');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not in the allowed views'));
  });

  it('computes grid columns from width and cardMinWidth', () => {
    const { container } = render(
      <ReactDataGrid data={people} defaultView="grid" cardMinWidth={300} />,
    );
    // Test ResizeObserver stub reports 1024px: floor((1024+16)/(300+16)) = 3
    expect(container.querySelector('.aits-grid')!.getAttribute('data-columns')).toBe('3');
  });

  it('keeps sort, search, selection and page across view switches (scenario 3)', async () => {
    vi.useFakeTimers();
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `r${i}`,
      name: `Name ${String(i).padStart(2, '0')}`,
      group: i % 2 ? 'odd' : 'even',
    }));
    const { container } = render(
      <ReactDataGrid
        data={many}
        getRowId="id"
        selectionMode="multi"
        defaultPageSize={10}
        pageSizeOptions={[10, 25]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Name' })); // sort asc
    fireEvent.click(screen.getByRole('button', { name: 'Name' })); // sort desc
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'odd' } });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    const firstRow = container.querySelector('.aits-tbody .aits-row') as HTMLElement;
    const firstRowId = firstRow.getAttribute('data-row-id');
    fireEvent.click(within(firstRow).getByRole('checkbox'));

    for (const view of ['Grid', 'List', 'Table']) {
      fireEvent.click(within(switcher()).getByRole('radio', { name: view }));
      expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('odd');
      expect(screen.getByText('11–20 of 20')).toBeInTheDocument();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(container.querySelector(`[data-row-id="${firstRowId}"]`)).toHaveAttribute(
        'data-selected',
      );
    }
    vi.useRealTimers();
  });
});
