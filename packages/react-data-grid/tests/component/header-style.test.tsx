import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';
import type { HeaderStyle } from '../../src/types';

const rows = [{ id: '1', name: 'Ada', status: 'Active' }];
const columns = [
  { field: 'name', header: 'Customer Name' },
  { field: 'status', header: 'Status' },
];

function headerRow() {
  return screen.getByRole('columnheader', { name: 'Customer Name' }).closest('[role="row"]') as HTMLElement;
}

function setColor(dialog: HTMLElement, label: string, value: string) {
  const input = dialog.querySelector(`input[type="color"][aria-label="${label}"]`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing ${label} color input`);
  fireEvent.change(input, { target: { value } });
}

function openHeaderStyle() {
  fireEvent.click(screen.getByRole('button', { name: 'Format' }));
  const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
  fireEvent.click(within(list).getByRole('button', { name: 'Header Style' }));
  return screen.getByRole('dialog', { name: 'Header Style' });
}

describe('header style', () => {
  it('adds Header Style beside the existing formatting actions', () => {
    render(<ReactDataGrid data={rows} columns={columns} />);
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByRole('button', { name: 'Add rule' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Header Style' })).toBeInTheDocument();
    expect(within(list).getByText('No conditional formatting rules added.')).toBeInTheDocument();
  });

  it('applies header presentation on Apply and leaves the column name unchanged', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" />);
    const editor = openHeaderStyle();
    expect(screen.queryByRole('dialog', { name: 'Conditional Formatting' })).toBeNull();

    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Background Color' }));
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Text Color' }));
    setColor(editor, 'Background Color', '#1e293b');
    setColor(editor, 'Text Color', '#ffffff');
    fireEvent.change(within(editor).getByRole('spinbutton', { name: 'Font Size' }), {
      target: { value: '14' },
    });
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Font Weight' }), {
      target: { value: '700' },
    });
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Text Transform' }), {
      target: { value: 'uppercase' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Apply' }));

    expect(screen.queryByRole('dialog', { name: 'Header Style' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Conditional Formatting' })).toBeInTheDocument();
    const row = headerRow();
    expect(row.style.backgroundColor).toBe('rgb(30, 41, 59)');
    expect(row.style.color).toBe('rgb(255, 255, 255)');
    expect(row.style.fontSize).toBe('14px');
    expect(row.style.fontWeight).toBe('700');
    expect(row.style.textTransform).toBe('uppercase');
    expect(row.style.getPropertyValue('--aits-header-bg')).toBe('#1e293b');
    expect(screen.getByRole('columnheader', { name: 'Customer Name' })).toHaveTextContent('Customer Name');
  });

  it('discards unsaved edits on Cancel', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        defaultHeaderStyle={{ backgroundColor: '#112233', fontWeight: '700' }}
      />,
    );
    expect(headerRow().style.backgroundColor).toBe('rgb(17, 34, 51)');
    const editor = openHeaderStyle();
    setColor(editor, 'Background Color', '#ff0000');
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Font Weight' }), {
      target: { value: 'normal' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Header Style' })).toBeNull();
    expect(headerRow().style.backgroundColor).toBe('rgb(17, 34, 51)');
    expect(headerRow().style.fontWeight).toBe('700');

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Header Style' }));
    const restored = screen.getByRole('dialog', { name: 'Header Style' });
    expect(within(restored).getByRole('combobox', { name: 'Font Weight' })).toHaveValue('700');
    expect(within(restored).getByRole('checkbox', { name: 'Apply Background Color' })).toBeChecked();
  });

  it('keeps the current header when the font size is invalid', () => {
    render(<ReactDataGrid data={rows} columns={columns} />);
    const editor = openHeaderStyle();
    fireEvent.change(within(editor).getByRole('spinbutton', { name: 'Font Size' }), {
      target: { value: '0' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Apply' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent('Enter a valid number.');
    expect(screen.getByRole('dialog', { name: 'Header Style' })).toBeInTheDocument();
    expect(headerRow().style.fontSize).toBe('');
  });

  it('reports a controlled style only after Apply', () => {
    const seen: HeaderStyle[] = [];
    function Host() {
      const [style, setStyle] = useState<HeaderStyle>({ textTransform: 'lowercase' });
      return (
        <ReactDataGrid
          data={rows}
          columns={columns}
          headerStyle={style}
          onHeaderStyleChange={(next) => {
            seen.push(next);
            setStyle(next);
          }}
        />
      );
    }
    render(<Host />);
    expect(headerRow().style.textTransform).toBe('lowercase');
    const editor = openHeaderStyle();
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Text Transform' }), {
      target: { value: 'capitalize' },
    });
    expect(headerRow().style.textTransform).toBe('lowercase');
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }));
    expect(seen).toEqual([]);
    expect(headerRow().style.textTransform).toBe('lowercase');

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Header Style' }));
    const again = screen.getByRole('dialog', { name: 'Header Style' });
    fireEvent.change(within(again).getByRole('combobox', { name: 'Text Transform' }), {
      target: { value: 'capitalize' },
    });
    fireEvent.click(within(again).getByRole('button', { name: 'Apply' }));
    expect(seen).toEqual([{ textTransform: 'capitalize' }]);
    expect(headerRow().style.textTransform).toBe('capitalize');
  });
});
