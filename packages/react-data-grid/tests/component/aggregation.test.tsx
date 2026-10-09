import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = [
  { id: '1', department: 'Sales', employee: 'John', salary: 40000, bonus: 1000 },
  { id: '2', department: 'Sales', employee: 'Sarah', salary: 50000, bonus: 500 },
  { id: '3', department: 'IT', employee: 'David', salary: 60000, bonus: 0 },
  { id: '4', department: 'IT', employee: 'Priya', salary: 70000, bonus: 250.5 },
];

const columns = [
  { field: 'department', rowGroup: true },
  { field: 'employee' },
  { field: 'salary', type: 'number' as const, aggregate: 'sum' as const },
  { field: 'bonus', type: 'number' as const, aggregate: 'sum' as const },
];

function aggregateText(columnId: string) {
  return [...document.querySelectorAll(`[data-aggregate="${columnId}"]`)].map(
    (element) => element.textContent,
  );
}

describe('aggregation', () => {
  it('shows each group sum in that column and keeps it when the group is collapsed', () => {
    render(
      <ReactDataGrid data={rows} columns={columns} getRowId="id" locale="en-US" />,
    );
    expect(aggregateText('salary')).toEqual(['130,000', '90,000']);
    expect(aggregateText('bonus')).toEqual(['250.5', '1,500']);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('40,000')).toBeInTheDocument();

    const sales = document.querySelector('[data-group-key="department=s:Sales"]');
    expect(sales).not.toBeNull();
    fireEvent.click(sales!);
    expect(screen.queryByText('John')).not.toBeInTheDocument();
    expect(aggregateText('salary')).toEqual(['130,000', '90,000']);
    expect(screen.getByText('Priya')).toBeInTheDocument();
  });

  it('recalculates when the rows change and keeps leaf formatting', () => {
    const { rerender } = render(
      <ReactDataGrid data={rows} columns={columns} getRowId="id" locale="en-US" />,
    );
    expect(aggregateText('salary')).toEqual(['130,000', '90,000']);

    rerender(
      <ReactDataGrid
        data={rows.filter((row) => row.employee !== 'Sarah')}
        columns={columns}
        getRowId="id"
        locale="en-US"
      />,
    );
    expect(aggregateText('salary')).toEqual(['130,000', '40,000']);
  });

  it('sums only the filtered rows and keeps the full total across pages', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        locale="en-US"
        defaultFilters={[{ columnId: 'department', operator: 'equals', value: 'Sales' }]}
        defaultPageSize={2}
        pageSizeOptions={[2, 10]}
      />,
    );
    expect(aggregateText('salary')).toEqual(['90,000']);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.queryByText('Sarah')).not.toBeInTheDocument();
    expect(screen.queryByText('David')).not.toBeInTheDocument();
  });

  it('leaves the flat grid unchanged when nothing is grouped', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[
          { field: 'department' },
          { field: 'employee' },
          { field: 'salary', type: 'number', aggregate: 'sum' },
        ]}
        getRowId="id"
        locale="en-US"
      />,
    );
    expect(document.querySelector('[data-group]')).toBeNull();
    expect(document.querySelector('[data-aggregate]')).toBeNull();
    expect(screen.getByText('40,000')).toBeInTheDocument();
    expect(screen.getByText('70,000')).toBeInTheDocument();
  });

  it('hides a total when its column is hidden and pins the total with the column', () => {
    const { rerender } = render(
      <ReactDataGrid
        data={rows}
        columns={columns.map((column) =>
          column.field === 'salary' ? { ...column, hidden: true } : column,
        )}
        getRowId="id"
        locale="en-US"
      />,
    );
    expect(document.querySelector('[data-aggregate="salary"]')).toBeNull();
    expect(aggregateText('bonus')).toEqual(['250.5', '1,500']);

    rerender(
      <ReactDataGrid
        data={rows}
        columns={columns.map((column) =>
          column.field === 'salary' ? { ...column, pinned: 'end' as const } : column,
        )}
        getRowId="id"
        locale="en-US"
      />,
    );
    const pinned = [...document.querySelectorAll('[data-aggregate="salary"]')];
    expect(pinned).toHaveLength(2);
    expect(pinned.every((cell) => cell.getAttribute('data-pinned') === 'end')).toBe(true);
    expect(pinned.map((cell) => cell.textContent)).toEqual(['130,000', '90,000']);
  });

  it('keeps custom cell content on data rows and shows totals in the list', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[
          { field: 'department', rowGroup: true },
          {
            field: 'employee',
            render: (ctx: { formattedValue: string }) => <em>{ctx.formattedValue}</em>,
          },
          {
            field: 'salary',
            type: 'currency',
            formatOptions: { currency: 'USD', maximumFractionDigits: 0 },
            aggregate: 'sum',
          },
        ]}
        getRowId="id"
        locale="en-US"
        view="list"
      />,
    );
    const totals = [...document.querySelectorAll('[data-aggregate="salary"]')].map(
      (element) => element.textContent,
    );
    expect(totals).toEqual(['Salary $130,000', 'Salary $90,000']);
    expect([...document.querySelectorAll('em')].map((element) => element.textContent)).toEqual([
      'David',
      'Priya',
      'John',
      'Sarah',
    ]);
  });

  it('shows the same totals while scrolling', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        locale="en-US"
        pagination="scroll"
        height={320}
      />,
    );
    expect(aggregateText('salary')).toEqual(['130,000', '90,000']);
  });
});
