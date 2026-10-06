import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';
import type { ConditionalFormatRule, FormatOperator } from '../../src/types';

const rows = [
  { id: '1', name: 'Ada', status: 'Active', amount: 15000, country: 'India' },
  { id: '2', name: 'Bea', status: 'Paused', amount: 50, country: '' },
];

const columns = [
  { field: 'name', header: 'Customer Name' },
  { field: 'status', header: 'Status' },
  { field: 'amount', header: 'Amount', type: 'number' as const },
  { field: 'country', header: 'Country' },
];

function rowOf(text: string) {
  return screen.getByText(text).closest('[role="row"]') as HTMLElement;
}

function cellOf(rowName: string, text: string) {
  return within(rowOf(rowName)).getByText(text).closest('[role="gridcell"]') as HTMLElement;
}

function painted(el: HTMLElement | null) {
  return el?.getAttribute('data-formatted') === 'true';
}

function setColor(dialog: HTMLElement, label: string, value: string) {
  const input = dialog.querySelector(`input[type="color"][aria-label="${label}"]`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing ${label} color input`);
  fireEvent.change(input, { target: { value } });
}

function rule(partial: Omit<ConditionalFormatRule, 'id' | 'style'> & { id?: string; style?: ConditionalFormatRule['style'] }): ConditionalFormatRule {
  return {
    id: partial.id ?? partial.operator,
    columnId: partial.columnId,
    operator: partial.operator,
    value: partial.value,
    value2: partial.value2,
    scope: partial.scope,
    style: partial.style ?? { backgroundColor: '#ff0000' },
  };
}

describe('conditional formatting', () => {
  it('hides the Format button when the feature is turned off and keeps Export', () => {
    render(<ReactDataGrid data={rows} columns={columns} conditionalFormatting={false} />);
    expect(screen.queryByRole('button', { name: 'Format' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('shows an empty list, then creates, edits, and deletes a rule', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" locale="en-US" />);
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(list).getByText('No conditional formatting rules added.')).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: 'Add rule' }));
    const editor = screen.getByRole('dialog', { name: 'Add rule' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent('Select a column.');

    fireEvent.click(within(editor).getByRole('radio', { name: 'Status' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent('Select an operator.');

    fireEvent.change(within(editor).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'equal' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent('Enter a value.');

    fireEvent.change(within(editor).getByRole('textbox', { name: 'Value' }), {
      target: { value: 'Active' },
    });
    fireEvent.click(within(editor).getByRole('radio', { name: 'Cell' }));
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Background' }));
    setColor(editor, 'Background', '#00ff00');
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Text' }));
    setColor(editor, 'Text', '#ffffff');
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Font weight' }), {
      target: { value: '700' },
    });
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Font style' }), {
      target: { value: 'italic' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog', { name: 'Add rule' })).toBeNull();
    expect(within(list).getByText('Status | Equal | Active | Cell')).toBeInTheDocument();
    expect(within(list).getByText('Background: #00ff00')).toBeInTheDocument();
    expect(within(list).getByText('Text: #ffffff')).toBeInTheDocument();
    expect(within(list).getByText('Font: 700, Italic')).toBeInTheDocument();

    const active = cellOf('Ada', 'Active');
    expect(painted(active)).toBe(true);
    expect(active.style.backgroundColor).toBe('rgb(0, 255, 0)');
    expect(active.style.color).toBe('rgb(255, 255, 255)');
    expect(active.style.fontWeight).toBe('700');
    expect(active.style.fontStyle).toBe('italic');
    expect(painted(cellOf('Bea', 'Paused'))).toBe(false);

    fireEvent.click(within(list).getByRole('button', { name: 'Edit' }));
    const edit = screen.getByRole('dialog', { name: 'Edit rule' });
    expect(within(edit).getByRole('radio', { name: 'Status' })).toBeChecked();
    expect(within(edit).getByRole('combobox', { name: 'Operator' })).toHaveValue('equal');
    fireEvent.change(within(edit).getByRole('textbox', { name: 'Value' }), {
      target: { value: 'Paused' },
    });
    fireEvent.click(within(edit).getByRole('button', { name: 'Save' }));
    expect(painted(cellOf('Ada', 'Active'))).toBe(false);
    expect(painted(cellOf('Bea', 'Paused'))).toBe(true);

    fireEvent.click(within(list).getByRole('button', { name: /Delete/ }));
    expect(within(list).getByText('No conditional formatting rules added.')).toBeInTheDocument();
    expect(painted(cellOf('Bea', 'Paused'))).toBe(false);
  });

  it('discards a draft on cancel and keeps existing rules', () => {
    const existing: ConditionalFormatRule[] = [
      rule({ columnId: 'status', operator: 'equal', value: 'Active', scope: 'cell' }),
    ];
    render(
      <ReactDataGrid data={rows} columns={columns} getRowId="id" defaultFormatRules={existing} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Format/ }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Add rule' }));
    const editor = screen.getByRole('dialog', { name: 'Add rule' });
    fireEvent.click(within(editor).getByRole('radio', { name: 'Country' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Add rule' })).toBeNull();
    expect(within(list).getByText('Status | Equal | Active | Cell')).toBeInTheDocument();
    expect(within(list).queryByText(/Country/)).toBeNull();
    expect(painted(cellOf('Ada', 'Active'))).toBe(true);
  });

  it('requires both bounds for between and no value for is empty', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" locale="en-US" />);
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Add rule' }));
    const editor = screen.getByRole('dialog', { name: 'Add rule' });
    fireEvent.click(within(editor).getByRole('radio', { name: 'Amount' }));
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'between' },
    });
    expect(within(editor).getByRole('textbox', { name: 'Value' })).toBeInTheDocument();
    expect(within(editor).getByRole('textbox', { name: 'Value 2' })).toBeInTheDocument();
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Value' }), {
      target: { value: '10' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent('Enter both values.');
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Value' }), {
      target: { value: 'abc' },
    });
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Value 2' }), {
      target: { value: '20' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent('Enter a valid number.');

    fireEvent.change(within(editor).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'isEmpty' },
    });
    expect(within(editor).queryByRole('textbox', { name: 'Value' })).toBeNull();
    expect(within(editor).queryByRole('textbox', { name: 'Value 2' })).toBeNull();
    fireEvent.click(within(editor).getByRole('radio', { name: 'Country' }));
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Background' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog', { name: 'Add rule' })).toBeNull();
    expect(painted(cellOf('Bea', 'Bea'))).toBe(false);
    const countryCell = within(rowOf('Bea')).getAllByRole('gridcell')[3]!;
    expect(painted(countryCell)).toBe(true);
    expect(painted(within(rowOf('Ada')).getAllByRole('gridcell')[3]!)).toBe(false);
  });

  it('paints the whole row when scope is Row and keeps sorting', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" locale="en-US" />);
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Add rule' }));
    const editor = screen.getByRole('dialog', { name: 'Add rule' });
    fireEvent.click(within(editor).getByRole('radio', { name: 'Amount' }));
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'gt' },
    });
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Value' }), {
      target: { value: '10000' },
    });
    fireEvent.click(within(editor).getByRole('radio', { name: 'Row' }));
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Background' }));
    setColor(editor, 'Background', '#ffff00');
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    expect(within(list).getByText('Amount | Greater than | 10000 | Row')).toBeInTheDocument();
    expect(painted(cellOf('Ada', 'Ada'))).toBe(true);
    expect(painted(cellOf('Ada', 'Active'))).toBe(true);
    expect(cellOf('Ada', 'Ada').style.backgroundColor).toBe('rgb(255, 255, 0)');
    expect(painted(cellOf('Bea', 'Bea'))).toBe(false);
    expect(rowOf('Ada')).toHaveAttribute('data-formatted', 'true');

    fireEvent.click(within(list).getByRole('button', { name: 'Close' }));
    const header = screen.getByRole('columnheader', { name: /Amount/ });
    fireEvent.click(within(header).getByRole('button', { name: 'Amount' }));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    const names = Array.from(document.querySelectorAll('.aits-tbody .aits-row')).map(
      (row) => row.querySelector('.aits-cell')?.textContent,
    );
    expect(names).toEqual(['Bea', 'Ada']);
    expect(painted(cellOf('Ada', 'Ada'))).toBe(true);
  });

  it.each<[FormatOperator, string, string | undefined, string | undefined, string, string]>([
    ['equal', 'status', 'Active', undefined, 'Ada', 'Active'],
    ['notEqual', 'status', 'Active', undefined, 'Bea', 'Paused'],
    ['contains', 'status', 'cti', undefined, 'Ada', 'Active'],
    ['notContains', 'status', 'act', undefined, 'Bea', 'Paused'],
    ['startsWith', 'status', 'Act', undefined, 'Ada', 'Active'],
    ['endsWith', 'status', 'ive', undefined, 'Ada', 'Active'],
    ['isEmpty', 'country', undefined, undefined, 'Bea', 'Bea'],
    ['isNotEmpty', 'country', undefined, undefined, 'Ada', 'Ada'],
    ['between', 'amount', '1000', '20000', 'Ada', '15,000'],
    ['notBetween', 'amount', '1000', '20000', 'Bea', '50'],
    ['lt', 'amount', '100', undefined, 'Bea', '50'],
    ['lte', 'amount', '50', undefined, 'Bea', '50'],
    ['gt', 'amount', '10000', undefined, 'Ada', '15,000'],
    ['gte', 'amount', '15000', undefined, 'Ada', '15,000'],
  ])('applies %s on the grid', (operator, columnId, value, value2, rowName, cellText) => {
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        locale="en-US"
        defaultFormatRules={[
          rule({
            columnId,
            operator,
            value,
            value2,
            scope: 'cell',
            style: { backgroundColor: '#0000ff', fontWeight: '600', fontStyle: 'italic' },
          }),
        ]}
      />,
    );
    const cell =
      columnId === 'country'
        ? (within(rowOf(rowName)).getAllByRole('gridcell')[3] as HTMLElement)
        : cellOf(rowName, cellText);
    expect(painted(cell)).toBe(true);
    expect(cell.style.fontWeight).toBe('600');
    expect(cell.style.fontStyle).toBe('italic');
    expect(cell.style.backgroundColor).toBe('rgb(0, 0, 255)');
  });

  it('applies cell and row formatting in the grid and list views', () => {
    const { container } = render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        locale="en-US"
        defaultFormatRules={[
          rule({
            id: 'status',
            columnId: 'status',
            operator: 'equal',
            value: 'Active',
            scope: 'cell',
            style: { backgroundColor: '#00ff00' },
          }),
          rule({
            id: 'amount',
            columnId: 'amount',
            operator: 'gt',
            value: '10000',
            scope: 'row',
            style: { backgroundColor: '#ffff00' },
          }),
        ]}
      />,
    );
    const switcher = screen.getByRole('radiogroup', { name: 'View' });
    fireEvent.click(within(switcher).getByRole('radio', { name: 'Grid' }));
    const card = container.querySelector('.aits-card') as HTMLElement;
    expect(card.style.backgroundColor).toBe('rgb(255, 255, 0)');
    const statusField = within(card).getByText('Active').closest('.aits-card-field') as HTMLElement;
    expect(statusField.style.backgroundColor).toBe('rgb(0, 255, 0)');

    fireEvent.click(within(switcher).getByRole('radio', { name: 'List' }));
    const item = container.querySelector('.aits-list-item') as HTMLElement;
    expect(item.style.backgroundColor).toBe('rgb(255, 255, 0)');
    const subtitle = item.querySelector('.aits-list-secondary') as HTMLElement;
    expect(subtitle.style.backgroundColor).toBe('rgb(0, 255, 0)');
    expect(screen.getByRole('button', { name: /^Format/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('applies two rules at once and still filters', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        locale="en-US"
        defaultFormatRules={[
          rule({
            id: 'status',
            columnId: 'status',
            operator: 'equal',
            value: 'Active',
            scope: 'cell',
            style: { backgroundColor: '#00ff00' },
          }),
          rule({
            id: 'amount',
            columnId: 'amount',
            operator: 'gt',
            value: '10000',
            scope: 'row',
            style: { textColor: '#0000ff', fontWeight: '700' },
          }),
        ]}
      />,
    );
    expect(cellOf('Ada', 'Active').style.backgroundColor).toBe('rgb(0, 255, 0)');
    expect(cellOf('Ada', 'Ada').style.color).toBe('rgb(0, 0, 255)');
    expect(cellOf('Ada', 'Ada').style.fontWeight).toBe('700');
    expect(cellOf('Ada', 'Active').style.color).toBe('rgb(0, 0, 255)');
    expect(cellOf('Ada', 'Active').style.fontWeight).toBe('700');
    expect(painted(cellOf('Bea', 'Paused'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByRole('dialog', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Format/ })).toHaveTextContent('2');
  });
});
