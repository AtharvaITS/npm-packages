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
    expect(row.style.getPropertyValue('--aits-header-transform')).toBe('uppercase');
    const label = within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText(
      'Customer Name',
    );
    expect(label).toHaveTextContent('Customer Name');
    expect(label).toHaveStyle({ textTransform: 'uppercase' });

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByText('Text Transform: Uppercase')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Delete Header Style' })).toBeInTheDocument();
  });

  it('applies a color chosen while the checkbox is unchecked', () => {
    render(<ReactDataGrid data={rows} columns={columns} />);
    const editor = openHeaderStyle();
    const background = within(editor).getByRole('checkbox', { name: 'Apply Background Color' });
    const text = within(editor).getByRole('checkbox', { name: 'Apply Text Color' });
    expect(background).not.toBeChecked();
    expect(text).not.toBeChecked();
    expect(editor.querySelector('input[type="color"][aria-label="Background Color"]')).toBeEnabled();
    expect(editor.querySelector('input[type="color"][aria-label="Text Color"]')).toBeEnabled();
    setColor(editor, 'Background Color', '#112233');
    setColor(editor, 'Text Color', '#abcdef');
    fireEvent.click(within(editor).getByRole('button', { name: 'Apply' }));
    expect(headerRow().style.backgroundColor).toBe('rgb(17, 34, 51)');
    expect(headerRow().style.color).toBe('rgb(171, 205, 239)');
  });

  it('applies lowercase and capitalize on the header text', () => {
    const { rerender } = render(
      <ReactDataGrid key="lower" data={rows} columns={columns} defaultHeaderStyle={{ textTransform: 'lowercase' }} />,
    );
    expect(
      within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText('Customer Name'),
    ).toHaveStyle({ textTransform: 'lowercase' });

    rerender(
      <ReactDataGrid key="cap" data={rows} columns={columns} defaultHeaderStyle={{ textTransform: 'capitalize' }} />,
    );
    expect(
      within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText('Customer Name'),
    ).toHaveStyle({ textTransform: 'capitalize' });

    rerender(
      <ReactDataGrid key="none" data={rows} columns={columns} defaultHeaderStyle={{ textTransform: 'default' }} />,
    );
    expect(
      within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText('Customer Name').style
        .textTransform,
    ).toBe('');
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

  it('edits and deletes the header style from the formatting list', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        defaultHeaderStyle={{ textTransform: 'uppercase', fontWeight: '700' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByText('Text Transform: Uppercase')).toBeInTheDocument();
    expect(within(list).getByText('Font Weight: Bold')).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: 'Edit' }));
    const editor = screen.getByRole('dialog', { name: 'Header Style' });
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Text Transform' }), {
      target: { value: 'lowercase' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Apply' }));

    const saved = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(saved).getByText('Text Transform: Lowercase')).toBeInTheDocument();
    expect(
      within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText('Customer Name'),
    ).toHaveStyle({ textTransform: 'lowercase' });

    fireEvent.click(within(saved).getByRole('button', { name: 'Delete Header Style' }));
    expect(screen.queryByText('Text Transform: Lowercase')).toBeNull();
    expect(
      within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText('Customer Name').style
        .textTransform,
    ).toBe('');
    expect(headerRow().style.fontWeight).toBe('');
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
