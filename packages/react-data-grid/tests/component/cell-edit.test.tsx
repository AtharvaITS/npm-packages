import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

const row = { id: '1', name: 'Ada', city: 'London', qty: 2 };

describe('double-click cell editing', () => {
  it('does not edit when onCellEdit is omitted, and click still activates the row', () => {
    const onRowActivate = vi.fn();
    render(<ReactDataGrid data={[row]} getRowId="id" onRowActivate={onRowActivate} />);
    const cell = screen.getByRole('gridcell', { name: 'Ada' });
    fireEvent.click(cell);
    expect(onRowActivate).toHaveBeenCalledWith(row, '1', expect.any(Object));
    fireEvent.doubleClick(cell);
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
  });

  it('saves a table cell on Enter and leaves the value unchanged on Escape or blur', () => {
    const onCellEdit = vi.fn();
    render(<ReactDataGrid data={[row]} getRowId="id" onCellEdit={onCellEdit} />);

    const name = screen.getByRole('gridcell', { name: 'Ada' });
    fireEvent.doubleClick(name);
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(nameInput, { target: { value: 'Grace' } });
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith({
      row,
      rowId: '1',
      columnId: 'name',
      field: 'name',
      previousValue: 'Ada',
      value: 'Grace',
    });
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();

    onCellEdit.mockClear();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Ada' }));
    const escapeInput = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(escapeInput, { target: { value: 'Grace' } });
    fireEvent.keyDown(escapeInput, { key: 'Escape' });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Ada' }));
    const blurInput = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(blurInput, { target: { value: 'Grace' } });
    fireEvent.blur(blurInput);
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2' }));
    const qtyInput = screen.getByRole('textbox', { name: 'Qty' });
    fireEvent.change(qtyInput, { target: { value: '4' } });
    fireEvent.keyDown(qtyInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'qty', previousValue: 2, value: 4 }),
    );

    onCellEdit.mockClear();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2' }));
    const invalid = screen.getByRole('textbox', { name: 'Qty' });
    fireEvent.change(invalid, { target: { value: 'abc' } });
    fireEvent.keyDown(invalid, { key: 'Enter' });
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it('saves a card field and a list field with Enter', () => {
    const onCellEdit = vi.fn();
    const { unmount } = render(
      <ReactDataGrid
        data={[row]}
        getRowId="id"
        defaultView="grid"
        views={['grid']}
        onCellEdit={onCellEdit}
      />,
    );
    fireEvent.doubleClick(screen.getByText('London'));
    const cardInput = screen.getByRole('textbox', { name: 'City' });
    fireEvent.change(cardInput, { target: { value: 'Paris' } });
    fireEvent.keyDown(cardInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'city', previousValue: 'London', value: 'Paris' }),
    );
    unmount();

    onCellEdit.mockClear();
    render(
      <ReactDataGrid
        data={[row]}
        getRowId="id"
        defaultView="list"
        views={['list']}
        onCellEdit={onCellEdit}
      />,
    );
    fireEvent.doubleClick(screen.getByText('London'));
    const listInput = screen.getByRole('textbox', { name: 'City' });
    fireEvent.change(listInput, { target: { value: 'Paris' } });
    fireEvent.keyDown(listInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'city', previousValue: 'London', value: 'Paris' }),
    );
  });

  it('edits derived Place and Label columns through valueSetter', () => {
    const onCellEdit = vi.fn();
    const record = { id: '1', name: 'Ada', address: { city: 'London', country: 'UK' } };
    render(
      <ReactDataGrid
        data={[record]}
        getRowId="id"
        columns={[
          {
            id: 'label',
            header: 'Label',
            valueGetter: (item: typeof record) => `${item.name} (${item.address.city})`,
            valueSetter: (item: typeof record, value: unknown) => {
              const text = String(value ?? '');
              const match = /^(.*)\(([^()]*)\)\s*$/.exec(text);
              if (!match) return { ...item, name: text.trim() };
              return {
                ...item,
                name: match[1]!.trim(),
                address: { ...item.address, city: match[2]!.trim() },
              };
            },
          },
          {
            id: 'place',
            header: 'Place',
            valueGetter: (item: typeof record) => item.address,
            format: (value: unknown) => {
              const place = (value ?? {}) as { city?: string; country?: string };
              return [place.city, place.country].filter(Boolean).join(', ');
            },
            valueSetter: (item: typeof record, value: unknown) => {
              const text = String(value ?? '');
              const comma = text.indexOf(',');
              const city = (comma === -1 ? text : text.slice(0, comma)).trim();
              const country = comma === -1 ? '' : text.slice(comma + 1).trim();
              return { ...item, address: { city, country } };
            },
          },
        ]}
        onCellEdit={onCellEdit}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Ada (London)' }));
    const labelInput = screen.getByRole('textbox', { name: 'Label' });
    expect(labelInput).toHaveValue('Ada (London)');
    fireEvent.change(labelInput, { target: { value: 'Grace (Paris)' } });
    fireEvent.keyDown(labelInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'label',
        field: 'label',
        previousValue: 'Ada (London)',
        value: 'Grace (Paris)',
        nextRow: { ...record, name: 'Grace', address: { city: 'Paris', country: 'UK' } },
      }),
    );

    onCellEdit.mockClear();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'London, UK' }));
    const placeInput = screen.getByRole('textbox', { name: 'Place' });
    expect(placeInput).toHaveValue('London, UK');
    fireEvent.change(placeInput, { target: { value: 'Paris, France' } });
    fireEvent.keyDown(placeInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'place',
        field: 'place',
        previousValue: record.address,
        value: 'Paris, France',
        nextRow: { ...record, address: { city: 'Paris', country: 'France' } },
      }),
    );
  });

  it('does not edit a valueGetter column that has no valueSetter', () => {
    const onCellEdit = vi.fn();
    render(
      <ReactDataGrid
        data={[{ id: '1', name: 'Ada', city: 'London' }]}
        getRowId="id"
        columns={[
          {
            id: 'label',
            header: 'Label',
            valueGetter: (item) => `${item.name} (${item.city})`,
          },
        ]}
        onCellEdit={onCellEdit}
      />,
    );
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Ada (London)' }));
    expect(screen.queryByRole('textbox', { name: 'Label' })).not.toBeInTheDocument();
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it('does not edit a column that supplies render', () => {
    const onCellEdit = vi.fn();
    render(
      <ReactDataGrid
        data={[row]}
        getRowId="id"
        columns={[{ field: 'name', render: () => <span>Custom name</span> }, { field: 'city' }]}
        onCellEdit={onCellEdit}
      />,
    );
    fireEvent.doubleClick(screen.getByText('Custom name'));
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(onCellEdit).not.toHaveBeenCalled();
  });
});
