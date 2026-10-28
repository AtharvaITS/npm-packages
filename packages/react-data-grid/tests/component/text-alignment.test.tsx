import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';
import type { TextAlignment } from '../../src/types';

const rows = [{ id: '1', name: 'Ada Lovelace', amount: 42, status: 'Active' }];
const columns = [
  { field: 'name', header: 'Customer Name' },
  { field: 'amount', header: 'Amount', type: 'number' as const },
  { field: 'status', header: 'Status' },
];

function headerCell(name: string) {
  return screen.getByRole('columnheader', { name });
}

function dataCell(name: string) {
  return screen.getByRole('gridcell', { name });
}

function openTextAlignment() {
  fireEvent.click(screen.getByRole('button', { name: 'Format' }));
  const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
  fireEvent.click(within(list).getByRole('button', { name: 'Text Alignment' }));
  return screen.getByRole('dialog', { name: 'Text Alignment' });
}

function expectAligned(alignment: 'left' | 'center' | 'right') {
  const justify =
    alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start';
  expect(screen.getByRole('grid')).toHaveAttribute('data-text-align', alignment);
  for (const name of ['Customer Name', 'Amount', 'Status']) {
    expect(headerCell(name)).toHaveStyle({ textAlign: alignment, justifyContent: justify });
  }
  expect(dataCell('Ada Lovelace')).toHaveStyle({ textAlign: alignment, justifyContent: justify });
  expect(dataCell('42')).toHaveStyle({ textAlign: alignment, justifyContent: justify });
  expect(dataCell('Active')).toHaveStyle({ textAlign: alignment, justifyContent: justify });
  const headerButton = within(headerCell('Customer Name')).getByRole('button', { name: 'Customer Name' });
  expect(headerButton).toHaveStyle({
    textAlign: alignment,
    flexDirection: alignment === 'right' ? 'row-reverse' : 'row',
  });
}

describe('text alignment', () => {
  it('adds Text Alignment beside the existing formatting actions', () => {
    render(<ReactDataGrid data={rows} columns={columns} />);
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByRole('button', { name: 'Add rule' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Header Style' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Text Alignment' })).toBeInTheDocument();
    expect(within(list).getByText('No conditional formatting rules added.')).toBeInTheDocument();
  });

  it('applies one alignment to every header and data cell', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" />);
    expect(dataCell('Ada Lovelace')).toHaveAttribute('data-align', 'start');
    expect(dataCell('42')).toHaveAttribute('data-align', 'end');
    expect(headerCell('Customer Name').style.textAlign).toBe('');

    const editor = openTextAlignment();
    expect(screen.queryByRole('dialog', { name: 'Conditional Formatting' })).toBeNull();
    expect(within(editor).getByRole('checkbox', { name: 'Left' })).toBeChecked();
    expect(within(editor).getByRole('checkbox', { name: 'Center' })).not.toBeChecked();
    expect(within(editor).getByRole('checkbox', { name: 'Right' })).not.toBeChecked();

    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Center' }));
    expect(within(editor).getByRole('checkbox', { name: 'Left' })).not.toBeChecked();
    expect(within(editor).getByRole('checkbox', { name: 'Center' })).toBeChecked();
    expect(within(editor).getByRole('checkbox', { name: 'Right' })).not.toBeChecked();
    expect(headerCell('Customer Name').style.textAlign).toBe('');

    fireEvent.click(within(editor).getByRole('button', { name: 'Apply' }));

    expect(screen.queryByRole('dialog', { name: 'Text Alignment' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Conditional Formatting' })).toBeInTheDocument();
    expectAligned('center');
    expect(dataCell('42')).toHaveAttribute('data-align', 'end');

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByText('Text Alignment: Center')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Delete Text Alignment: Center' })).toBeInTheDocument();
    expect(within(list).getAllByText('Text Alignment: Center')).toHaveLength(1);
  });

  it('keeps a checked alignment selected when that checkbox is clicked again', () => {
    render(<ReactDataGrid data={rows} columns={columns} />);
    const editor = openTextAlignment();
    const left = within(editor).getByRole('checkbox', { name: 'Left' });
    fireEvent.click(left);
    expect(left).toBeChecked();
    expect(within(editor).getByRole('checkbox', { name: 'Center' })).not.toBeChecked();
    expect(within(editor).getByRole('checkbox', { name: 'Right' })).not.toBeChecked();
  });

  it('discards unsaved edits on Cancel', () => {
    render(
      <ReactDataGrid data={rows} columns={columns} defaultTextAlignment={{ alignment: 'right' }} />,
    );
    expectAligned('right');
    const editor = openTextAlignment();
    expect(within(editor).getByRole('checkbox', { name: 'Right' })).toBeChecked();
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Left' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Text Alignment' })).toBeNull();
    expectAligned('right');

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Text Alignment' }));
    const restored = screen.getByRole('dialog', { name: 'Text Alignment' });
    expect(within(restored).getByRole('checkbox', { name: 'Right' })).toBeChecked();
    expect(within(restored).getByRole('checkbox', { name: 'Left' })).not.toBeChecked();
  });

  it('edits and deletes the alignment from the formatting list', () => {
    render(
      <ReactDataGrid data={rows} columns={columns} defaultTextAlignment={{ alignment: 'center' }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByText('Text Alignment: Center')).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: 'Edit' }));
    const editor = screen.getByRole('dialog', { name: 'Text Alignment' });
    expect(within(editor).getByRole('checkbox', { name: 'Center' })).toBeChecked();
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Right' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Apply' }));

    const saved = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(saved).getByText('Text Alignment: Right')).toBeInTheDocument();
    expect(within(saved).queryByText('Text Alignment: Center')).toBeNull();
    expect(within(saved).getAllByText(/Text Alignment:/)).toHaveLength(1);
    expectAligned('right');

    fireEvent.click(within(saved).getByRole('button', { name: 'Delete Text Alignment: Right' }));
    expect(screen.queryByText('Text Alignment: Right')).toBeNull();
    expect(screen.getByRole('grid').hasAttribute('data-text-align')).toBe(false);
    expect(headerCell('Customer Name').style.textAlign).toBe('');
    expect(dataCell('Ada Lovelace').style.textAlign).toBe('');
    expect(dataCell('Ada Lovelace')).toHaveAttribute('data-align', 'start');
    expect(dataCell('42')).toHaveAttribute('data-align', 'end');
    expect(dataCell('42').style.justifyContent).toBe('');
    expect(within(headerCell('Amount')).getByRole('button', { name: 'Amount' }).style.flexDirection).toBe(
      '',
    );
  });

  it('reports a controlled alignment only after Apply', () => {
    const seen: TextAlignment[] = [];
    function Host() {
      const [alignment, setAlignment] = useState<TextAlignment>({ alignment: 'left' });
      return (
        <ReactDataGrid
          data={rows}
          columns={columns}
          textAlignment={alignment}
          onTextAlignmentChange={(next) => {
            seen.push(next);
            setAlignment(next);
          }}
        />
      );
    }
    render(<Host />);
    expectAligned('left');
    const editor = openTextAlignment();
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Center' }));
    expectAligned('left');
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }));
    expect(seen).toEqual([]);
    expectAligned('left');

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Text Alignment' }));
    const again = screen.getByRole('dialog', { name: 'Text Alignment' });
    fireEvent.click(within(again).getByRole('checkbox', { name: 'Center' }));
    fireEvent.click(within(again).getByRole('button', { name: 'Apply' }));
    expect(seen).toEqual([{ alignment: 'center' }]);
    expectAligned('center');
  });
});
