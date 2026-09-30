import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

type Row = { id: string; name: string; locked?: boolean };
const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: `r${i + 1}`,
  name: `Name ${i + 1}`,
  locked: i === 2,
}));

const rowEl = (id: string) => document.querySelector(`[data-row-id="${id}"]`) as HTMLElement;

describe('US5: select records and act on them', () => {
  it('single mode replaces the previous selection (scenario 1)', () => {
    const onSelectionChange = vi.fn();
    render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(within(rowEl('r1')).getByRole('checkbox'));
    fireEvent.click(within(rowEl('r2')).getByRole('checkbox'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['r2'], [rows[1]]);
    expect(rowEl('r1')).toHaveAttribute('aria-selected', 'false');
    expect(rowEl('r2')).toHaveAttribute('aria-selected', 'true');
    // No header "select all" in single mode.
    expect(within(screen.getAllByRole('columnheader')[0]!).queryByRole('checkbox')).toBeNull();
  });

  it('select all selects every matching selectable row across pages (scenario 2, 5)', () => {
    const onSelectionChange = vi.fn();
    render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="multi"
        isRowSelectable={(r) => !r.locked}
        onSelectionChange={onSelectionChange}
      />,
    );
    const header = within(screen.getAllByRole('columnheader')[0]!).getByRole('checkbox');
    fireEvent.click(header);
    const ids = onSelectionChange.mock.lastCall![0] as string[];
    expect(ids).toHaveLength(29);
    expect(ids).not.toContain('r3');
    expect(screen.getByText('29 selected')).toBeInTheDocument();
    expect((header as HTMLInputElement).checked).toBe(true);
    fireEvent.click(header);
    expect(onSelectionChange).toHaveBeenLastCalledWith([], []);
  });

  it('shows the indeterminate header state and the selected count', () => {
    render(<ReactDataGrid<Row> data={rows} getRowId="id" selectionMode="multi" />);
    fireEvent.click(within(rowEl('r1')).getByRole('checkbox'));
    const header = within(screen.getAllByRole('columnheader')[0]!).getByRole(
      'checkbox',
    ) as HTMLInputElement;
    expect(header.indeterminate).toBe(true);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select all 30' }));
    expect(screen.getByText('30 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText(/selected$/)).toBeNull();
  });

  it('Shift+click selects a range in display order (scenario 3)', () => {
    const onSelectionChange = vi.fn();
    render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(within(rowEl('r2')).getByRole('checkbox'));
    fireEvent.click(within(rowEl('r6')).getByRole('checkbox'), { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      ['r2', 'r3', 'r4', 'r5', 'r6'],
      expect.any(Array),
    );
  });

  it('non-selectable rows cannot be selected (scenario 5)', () => {
    const onSelectionChange = vi.fn();
    render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="multi"
        isRowSelectable={(r) => !r.locked}
        onSelectionChange={onSelectionChange}
      />,
    );
    const box = within(rowEl('r3')).getByRole('checkbox');
    expect(box).toBeDisabled();
    fireEvent.click(rowEl('r3'), { ctrlKey: true });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('prunes selected rows that disappear from new data (scenario 4)', () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(within(rowEl('r1')).getByRole('checkbox'));
    fireEvent.click(within(rowEl('r2')).getByRole('checkbox'));
    rerender(
      <ReactDataGrid<Row>
        data={rows.slice(1)}
        getRowId="id"
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith(['r2'], [rows[1]]);
  });

  it('supports controlled selection', () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="multi"
        selection={['r5']}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(rowEl('r5')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(rowEl('r1')).getByRole('checkbox'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['r5', 'r1'], expect.any(Array));
    expect(rowEl('r1')).toHaveAttribute('aria-selected', 'false');
    rerender(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        selectionMode="multi"
        selection={['r1']}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(rowEl('r1')).toHaveAttribute('aria-selected', 'true');
  });

  it.each(['table', 'grid', 'list'] as const)(
    '%s view: click and Enter activate the record (scenario 6)',
    (view) => {
      const onRowActivate = vi.fn();
      render(
        <ReactDataGrid<Row>
          data={rows}
          getRowId="id"
          defaultView={view}
          onRowActivate={onRowActivate}
        />,
      );
      fireEvent.click(rowEl('r4'));
      expect(onRowActivate).toHaveBeenLastCalledWith(rows[3], 'r4', expect.anything());
      const focusTarget =
        view === 'table' ? (rowEl('r5').querySelector('.aits-cell') as HTMLElement) : rowEl('r5');
      focusTarget.focus();
      fireEvent.keyDown(focusTarget, { key: 'Enter' });
      expect(onRowActivate).toHaveBeenLastCalledWith(rows[4], 'r5', expect.anything());
    },
  );

  it.each(['grid', 'list'] as const)('%s view: selection works with aria-selected', (view) => {
    const onSelectionChange = vi.fn();
    render(
      <ReactDataGrid<Row>
        data={rows}
        getRowId="id"
        defaultView={view}
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
      />,
    );
    const item = rowEl('r2');
    item.focus();
    fireEvent.keyDown(item, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['r2'], [rows[1]]);
    expect(rowEl('r2')).toHaveAttribute('aria-selected', 'true');
    if (view === 'list')
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('server mode: select all covers the loaded rows and says so', async () => {
    render(
      <ReactDataGrid<Row>
        dataMode="server"
        onDataRequest={() => {}}
        data={rows.slice(0, 25)}
        totalCount={100}
        getRowId="id"
        selectionMode="multi"
      />,
    );
    fireEvent.click(within(screen.getAllByRole('columnheader')[0]!).getByRole('checkbox'));
    expect(screen.getByText('All 25 on this page selected')).toBeInTheDocument();
  });
});
