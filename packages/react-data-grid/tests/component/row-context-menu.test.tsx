import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

const john = { id: '1', name: 'John', email: 'john@example.com', qty: 1 };
const sarah = { id: '2', name: 'Sarah', email: 'sarah@example.com', qty: 2 };
const david = { id: '3', name: 'David', email: 'david@example.com', qty: 3 };

function rightClick(container: HTMLElement, id: string) {
  const row = container.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
  if (!row) throw new Error(`missing row ${id}`);
  fireEvent.contextMenu(row, { clientX: 140, clientY: 90, button: 2 });
  return row;
}

describe('row context menu', () => {
  it('keeps the browser menu when the feature is off', () => {
    const { container } = render(<ReactDataGrid data={[sarah]} getRowId="id" />);
    const row = container.querySelector<HTMLElement>('[data-row-id="2"]')!;
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 20,
    });
    row.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens View, Edit, and Delete for the right-clicked row, not the selected row', () => {
    const onRowActivate = vi.fn();
    const onRowEdit = vi.fn();
    const onRowDelete = vi.fn();
    const { container } = render(
      <ReactDataGrid
        data={[{ ...john, note: 'john-secret' }, { ...sarah, note: 'secret-note' }, david]}
        getRowId="id"
        selectionMode="single"
        defaultSelection={['1']}
        enableRowContextMenu
        onRowActivate={onRowActivate}
        onRowEdit={onRowEdit}
        onRowDelete={onRowDelete}
        columns={[
          { field: 'name', header: 'Name' },
          { field: 'email', header: 'Email' },
          { field: 'qty', header: 'Qty', type: 'number' },
          { field: 'note', header: 'Note', hidden: true },
        ]}
      />,
    );

    const sarahRow = rightClick(container, '2');
    expect(onRowActivate).not.toHaveBeenCalled();
    expect(sarahRow).toHaveAttribute('aria-selected', 'false');
    expect(container.querySelector('[data-row-id="1"]')).toHaveAttribute('aria-selected', 'true');
    const menu = screen.getByRole('menu', { name: 'Row actions' });
    expect(within(menu).getByRole('menuitem', { name: 'View' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'View' }));
    const details = screen.getByRole('dialog', { name: 'Details' });
    expect(details).toHaveTextContent('sarah@example.com');
    expect(details).not.toHaveTextContent('john@example.com');
    expect(details).not.toHaveTextContent('secret-note');
    expect(within(details).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(within(details).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(onRowDelete).not.toHaveBeenCalled();
  });

  it('saves a valid edit, discards cancel, and blocks an invalid value', () => {
    const onRowEdit = vi.fn();
    const { container } = render(
      <ReactDataGrid
        data={[john, sarah]}
        getRowId="id"
        enableRowContextMenu
        onRowEdit={onRowEdit}
      />,
    );

    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Sarah');
    fireEvent.change(name, { target: { value: 'Sara' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sarah.name).toBe('Sarah');

    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Sara' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onRowEdit).not.toHaveBeenCalled();

    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Qty' }), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid value.');

    fireEvent.change(screen.getByRole('textbox', { name: 'Qty' }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Sara' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRowEdit).toHaveBeenCalledWith({
      row: sarah,
      rowId: '2',
      nextRow: { ...sarah, name: 'Sara', qty: 4 },
    });
    expect(sarah.name).toBe('Sarah');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirms delete only for the right-clicked row', () => {
    const onRowDelete = vi.fn();
    const { container } = render(
      <ReactDataGrid
        data={[john, sarah]}
        getRowId="id"
        selectionMode="single"
        defaultSelection={['1']}
        enableRowContextMenu
        onRowDelete={onRowDelete}
      />,
    );

    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const confirm = screen.getByRole('dialog', { name: 'Confirm delete' });
    expect(confirm).toHaveTextContent('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm).getByRole('button', { name: 'No' }));
    expect(onRowDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.pointerDown(document.querySelector('.aits-dialog-layer')!);
    expect(onRowDelete).not.toHaveBeenCalled();

    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onRowDelete).toHaveBeenCalledTimes(1);
    expect(onRowDelete).toHaveBeenCalledWith(sarah, '2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and outside click, and keeps a single menu when another row is right-clicked', () => {
    const { container } = render(
      <ReactDataGrid data={[john, sarah, david]} getRowId="id" enableRowContextMenu />,
    );
    rightClick(container, '2');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    rightClick(container, '2');
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    rightClick(container, '2');
    rightClick(container, '3');
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    fireEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    const details = screen.getByRole('dialog', { name: 'Details' });
    expect(details).toHaveTextContent('david@example.com');
    expect(details).not.toHaveTextContent('sarah@example.com');
  });

  it('opens from a card and a list item', () => {
    const { container, unmount } = render(
      <ReactDataGrid
        data={[sarah]}
        getRowId="id"
        defaultView="grid"
        views={['grid']}
        enableRowContextMenu
      />,
    );
    rightClick(container, '2');
    expect(screen.getByRole('menu', { name: 'Row actions' })).toBeInTheDocument();
    unmount();

    const list = render(
      <ReactDataGrid
        data={[sarah]}
        getRowId="id"
        defaultView="list"
        views={['list']}
        enableRowContextMenu
      />,
    );
    rightClick(list.container, '2');
    expect(screen.getByRole('menu', { name: 'Row actions' })).toBeInTheDocument();
  });

  it('updates and removes rows when the host stores the result locally', () => {
    function Host() {
      const [data, setData] = useState([john, sarah]);
      return (
        <ReactDataGrid
          aria-label="People"
          data={data}
          getRowId="id"
          enableRowContextMenu
          onRowEdit={(edit) =>
            setData((current) => current.map((row) => (row.id === edit.rowId ? edit.nextRow : row)))
          }
          onRowDelete={(_row, rowId) =>
            setData((current) => current.filter((row) => row.id !== rowId))
          }
        />
      );
    }
    const { container } = render(<Host />);
    rightClick(container, '2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Sara' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('gridcell', { name: 'Sara' })).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: 'Sarah' })).not.toBeInTheDocument();

    rightClick(container, '1');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(screen.queryByRole('gridcell', { name: 'John' })).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Sara' })).toBeInTheDocument();
  });
});
