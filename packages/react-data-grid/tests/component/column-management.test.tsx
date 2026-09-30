import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid, type ColumnStateItem, type GridState } from '../../src';

const rows = [
  { id: 'a', name: 'Ada', role: 'Math', city: 'London' },
  { id: 'b', name: 'Alan', role: 'CS', city: 'Wilmslow' },
];

const headerTitles = () => screen.getAllByRole('columnheader').map((h) => h.getAttribute('title'));
const openMenu = (header: string) =>
  fireEvent.click(screen.getByRole('button', { name: `${header} column options` }));

describe('US7: manage columns and remember preferences', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('resizes with the pointer within min/max (scenario 1)', () => {
    const onColumnStateChange = vi.fn();
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'name', minWidth: 100, maxWidth: 300 }, { field: 'role' }]}
        onColumnStateChange={onColumnStateChange}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Name/ });
    const handle = header.querySelector('.aits-resize-handle') as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 1000, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    const state = onColumnStateChange.mock.lastCall![0] as ColumnStateItem[];
    expect(state.find((c) => c.id === 'name')!.width).toBe(300);
  });

  it('resizes with Alt+Arrow in 10px steps', () => {
    const onColumnStateChange = vi.fn();
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'name', width: 150 }]}
        onColumnStateChange={onColumnStateChange}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Name/ });
    header.focus();
    fireEvent.keyDown(header, { key: 'ArrowRight', altKey: true });
    expect((onColumnStateChange.mock.lastCall![0] as ColumnStateItem[])[0]!.width).toBe(160);
  });

  it('reorders via the column menu and via drag and drop', () => {
    render(<ReactDataGrid data={rows} getRowId="id" />);
    expect(headerTitles()).toEqual(['Id', 'Name', 'Role', 'City']);
    openMenu('Name');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move right' }));
    expect(headerTitles()).toEqual(['Id', 'Role', 'Name', 'City']);

    const city = screen.getByRole('columnheader', { name: /City/ });
    const id = screen.getByRole('columnheader', { name: /Id/ });
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(() => 'city'),
      effectAllowed: '',
      dropEffect: '',
    };
    fireEvent.dragStart(city, { dataTransfer });
    fireEvent.dragOver(id, { dataTransfer });
    fireEvent.drop(id, { dataTransfer });
    expect(headerTitles()).toEqual(['City', 'Id', 'Role', 'Name']);
  });

  it('hides and shows columns; the last visible column cannot be hidden (scenario 2)', () => {
    render(<ReactDataGrid data={rows} columns={[{ field: 'name' }, { field: 'role' }]} />);
    openMenu('Role');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hide column' }));
    expect(headerTitles()).toEqual(['Name']);
    openMenu('Name');
    expect(screen.getByRole('menuitem', { name: 'Hide column' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    const dialog = screen.getByRole('dialog', { name: 'Columns' });
    expect(within(dialog).getByRole('checkbox', { name: 'Name' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Role' }));
    expect(headerTitles()).toEqual(['Name', 'Role']);
  });

  it('hidden columns and order apply to grid and list views (FR-038)', () => {
    const { container } = render(
      <ReactDataGrid
        data={rows}
        defaultView="list"
        defaultColumnState={[
          { id: 'city', order: 0 },
          { id: 'name', order: 1 },
          { id: 'role', order: 2, hidden: true },
          { id: 'id', order: 3, hidden: true },
        ]}
      />,
    );
    const item = container.querySelector('.aits-list-item')!;
    expect(item.querySelector('.aits-list-primary')!.textContent).toBe('London');
    expect(item.textContent).not.toContain('Math');
  });

  it('pins columns with sticky positioning (scenario 3)', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'name' }, { field: 'role' }, { field: 'city' }]}
      />,
    );
    openMenu('City');
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Pin to start' }));
    const city = screen.getByRole('columnheader', { name: /City/ });
    expect(city).toHaveAttribute('data-pinned', 'start');
    expect(headerTitles()[0]).toBe('City');
    expect(city.style.insetInlineStart).toBe('0px');
    const cell = document.querySelector('.aits-tbody .aits-cell[data-pinned="start"]');
    expect(cell).not.toBeNull();
  });

  it('supports controlled columnState and reports onStateChange with the changed key', () => {
    const onStateChange = vi.fn();
    const onColumnStateChange = vi.fn();
    const state: ColumnStateItem[] = [{ id: 'role', order: 0, hidden: true }];
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'name' }, { field: 'role' }]}
        columnState={state}
        onColumnStateChange={onColumnStateChange}
        onStateChange={onStateChange}
      />,
    );
    expect(headerTitles()).toEqual(['Name']);
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Role' }));
    expect(onColumnStateChange).toHaveBeenCalled();
    expect(headerTitles()).toEqual(['Name']); // controlled: unchanged until host updates
    const [nextState, key] = onStateChange.mock.lastCall! as [GridState, keyof GridState];
    expect(key).toBe('columnState');
    expect(nextState.columnState.find((c) => c.id === 'role')!.hidden).toBe(false);
  });

  it('disables features individually', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'name', sortable: false }]}
        enableColumnResize={false}
        enableColumnReorder={false}
        enableColumnHide={false}
        enableColumnPin={false}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Name/ });
    expect(header.querySelector('.aits-resize-handle')).toBeNull();
    expect(header).not.toHaveAttribute('draggable', 'true');
    expect(screen.queryByRole('button', { name: 'Name column options' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
  });

  it('persists view, sort, page size and column layout across remounts (scenario 4)', async () => {
    vi.useFakeTimers();
    const many = Array.from({ length: 60 }, (_, i) => ({ id: i, name: `N${i}`, role: 'r' }));
    const first = render(<ReactDataGrid data={many} persistStateKey="emp" />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Rows per page' }), {
      target: { value: '50' },
    });
    openMenu('Role');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hide column' }));
    fireEvent.click(within(screen.getByRole('radiogroup')).getByRole('radio', { name: 'List' }));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    first.unmount();
    const saved = JSON.parse(localStorage.getItem('@atharvaits/react-data-grid:emp')!);
    expect(saved).toMatchObject({
      v: 1,
      view: 'list',
      pageSize: 50,
      sort: [{ columnId: 'name', direction: 'asc' }],
    });

    const { container } = render(<ReactDataGrid data={many} persistStateKey="emp" />);
    expect(container.querySelector('.aits-root')).toHaveAttribute('data-view', 'list');
    expect(screen.getByText('1–50 of 60')).toBeInTheDocument();
    expect(container.textContent).not.toContain('Role:');
  });

  it('ignores saved preferences for fields that no longer exist (scenario 5)', () => {
    localStorage.setItem(
      '@atharvaits/react-data-grid:old',
      JSON.stringify({
        v: 1,
        view: 'table',
        sort: [{ columnId: 'gone', direction: 'asc' }],
        pageSize: 10,
        columns: [
          { id: 'gone', order: 0, width: 999 },
          { id: 'name', order: 1, width: 222 },
        ],
      }),
    );
    const many = Array.from({ length: 30 }, (_, i) => ({ name: `N${i}` }));
    render(<ReactDataGrid data={many} persistStateKey="old" />);
    expect(screen.getByText('1–10 of 30')).toBeInTheDocument();
    expect(headerTitles()).toEqual(['Name']);
  });
});
