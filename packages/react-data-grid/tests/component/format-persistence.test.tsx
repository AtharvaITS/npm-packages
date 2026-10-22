import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';
import type { ConditionalFormatRule, HeaderStyle } from '../../src/types';

const rows = [
  { id: '1', name: 'Ada', status: 'Active' },
  { id: '2', name: 'Bea', status: 'Paused' },
];

const columns = [
  { field: 'name', header: 'Customer Name' },
  { field: 'status', header: 'Status' },
];

const STORAGE_KEY = '@atharvaits/react-data-grid:fmt';

const savedRule: ConditionalFormatRule = {
  id: 'status-active',
  columnId: 'status',
  operator: 'equal',
  value: 'Active',
  scope: 'cell',
  style: { backgroundColor: '#00ff00', fontWeight: '700', fontStyle: 'italic' },
};

const savedHeader: HeaderStyle = { textTransform: 'uppercase', fontWeight: '700' };

function cellOf(rowName: string, text: string) {
  const row = screen.getByText(rowName).closest('[role="row"]') as HTMLElement;
  return within(row).getByText(text).closest('[role="gridcell"]') as HTMLElement;
}

function headerLabel() {
  return within(screen.getByRole('columnheader', { name: 'Customer Name' })).getByText('Customer Name');
}

function seed(formatRules: ConditionalFormatRule[] = [savedRule], headerStyle: HeaderStyle = savedHeader) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      v: 1,
      view: 'table',
      sort: [],
      pageSize: 25,
      columns: [],
      formatRules,
      headerStyle,
    }),
  );
}

describe('formatting persistence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('restores applied rules and header style after refresh, and keeps a delete', async () => {
    vi.useFakeTimers();
    const first = render(
      <ReactDataGrid data={rows} columns={columns} getRowId="id" persistStateKey="fmt" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Conditional Formatting' })).getByRole('button', { name: 'Add rule' }));
    const editor = screen.getByRole('dialog', { name: 'Add rule' });
    fireEvent.click(within(editor).getByRole('radio', { name: 'Status' }));
    fireEvent.change(within(editor).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'equal' },
    });
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Value' }), {
      target: { value: 'Active' },
    });
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Apply Background' }));
    const color = editor.querySelector('input[type="color"][aria-label="Background"]');
    if (!(color instanceof HTMLInputElement)) throw new Error('Missing background color input');
    fireEvent.change(color, { target: { value: '#00ff00' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    const list = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    fireEvent.click(within(list).getByRole('button', { name: 'Header Style' }));
    const headerEditor = screen.getByRole('dialog', { name: 'Header Style' });
    fireEvent.change(within(headerEditor).getByRole('combobox', { name: 'Text Transform' }), {
      target: { value: 'uppercase' },
    });
    fireEvent.click(within(headerEditor).getByRole('button', { name: 'Apply' }));

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    first.unmount();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      formatRules: ConditionalFormatRule[];
      headerStyle: HeaderStyle;
    };
    expect(stored.formatRules).toHaveLength(1);
    expect(stored.formatRules[0]).toMatchObject({
      columnId: 'status',
      operator: 'equal',
      value: 'Active',
      scope: 'cell',
    });
    expect(stored.headerStyle.textTransform).toBe('uppercase');

    const second = render(
      <ReactDataGrid data={rows} columns={columns} getRowId="id" persistStateKey="fmt" />,
    );
    expect(cellOf('Ada', 'Active').style.backgroundColor).toBe('rgb(0, 255, 0)');
    expect(headerLabel()).toHaveStyle({ textTransform: 'uppercase' });
    fireEvent.click(screen.getByRole('button', { name: /^Format/ }));
    const restored = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(restored).getByText('Status | Equal | Active | Cell')).toBeInTheDocument();
    expect(within(restored).getByText('Text Transform: Uppercase')).toBeInTheDocument();

    fireEvent.click(within(restored).getAllByRole('button', { name: 'Edit' })[0]!);
    const edit = screen.getByRole('dialog', { name: 'Edit rule' });
    fireEvent.change(within(edit).getByRole('textbox', { name: 'Value' }), {
      target: { value: 'Paused' },
    });
    fireEvent.click(within(edit).getByRole('button', { name: 'Save' }));
    const edited = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(edited).getByText('Status | Equal | Paused | Cell')).toBeInTheDocument();
    expect(cellOf('Bea', 'Paused').style.backgroundColor).toBe('rgb(0, 255, 0)');

    fireEvent.click(within(edited).getByRole('button', { name: 'Delete Status | Equal | Paused | Cell' }));
    fireEvent.click(within(edited).getByRole('button', { name: 'Delete Header Style' }));
    expect(within(edited).getByText('No conditional formatting rules added.')).toBeInTheDocument();
    expect(within(edited).queryByText('Text Transform: Uppercase')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    second.unmount();

    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" persistStateKey="fmt" />);
    expect(cellOf('Ada', 'Active').getAttribute('data-formatted')).not.toBe('true');
    expect(headerLabel().style.textTransform).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    const cleared = screen.getByRole('dialog', { name: 'Conditional Formatting' });
    expect(within(cleared).getByText('No conditional formatting rules added.')).toBeInTheDocument();
    expect(within(cleared).queryByText('Text Transform: Uppercase')).toBeNull();
  });

  it('does not let saved formatting replace controlled props', () => {
    seed();
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        persistStateKey="fmt"
        formatRules={[]}
        headerStyle={{}}
      />,
    );
    expect(cellOf('Ada', 'Active').getAttribute('data-formatted')).not.toBe('true');
    expect(headerLabel().style.textTransform).toBe('');
  });

  it('restores saved formatting without notifying the host', () => {
    seed();
    const onFormatRulesChange = vi.fn();
    const onHeaderStyleChange = vi.fn();
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        persistStateKey="fmt"
        onFormatRulesChange={onFormatRulesChange}
        onHeaderStyleChange={onHeaderStyleChange}
      />,
    );
    expect(cellOf('Ada', 'Active').style.backgroundColor).toBe('rgb(0, 255, 0)');
    expect(headerLabel()).toHaveStyle({ textTransform: 'uppercase' });
    expect(onFormatRulesChange).not.toHaveBeenCalled();
    expect(onHeaderStyleChange).not.toHaveBeenCalled();
  });
});
