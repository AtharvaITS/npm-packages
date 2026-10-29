import { fireEvent, render, screen } from '@testing-library/react';
import type { DragEvent } from 'react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = [
  { id: '1', country: 'USA', department: 'Sales', name: 'John', status: 'Active' },
  { id: '2', country: 'USA', department: 'Sales', name: 'Sarah', status: 'Active' },
  { id: '3', country: 'USA', department: 'Support', name: 'David', status: 'Inactive' },
  { id: '4', country: 'India', department: 'Sales', name: 'Priya', status: 'Active' },
  { id: '5', country: null, department: 'Sales', name: 'Blank', status: 'Active' },
];

const columns = [
  { field: 'country', rowGroup: true, rowGroupIndex: 0 },
  { field: 'department', rowGroup: true, rowGroupIndex: 1 },
  { field: 'name' },
  { field: 'status' },
];

function groupLabels() {
  return [...document.querySelectorAll('.aits-group-label')].map((element) => element.textContent);
}

function groupByKey(key: string) {
  return [...document.querySelectorAll('[data-group-key]')].find(
    (element) => element.getAttribute('data-group-key') === key,
  ) as HTMLElement;
}

function rowIdsAfter(group: HTMLElement) {
  const ids: string[] = [];
  let node = group.nextElementSibling;
  while (node && !node.hasAttribute('data-group')) {
    const id = node.getAttribute('data-row-id');
    if (id) ids.push(id);
    node = node.nextElementSibling;
  }
  return ids;
}

describe('row grouping', () => {
  it('renders a hierarchy and collapses only the clicked group', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" />);
    expect(groupLabels()).toEqual(['India', 'Sales', 'USA', 'Sales', 'Support', '(Blank)', 'Sales']);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();

    const usa = groupByKey('country=s:USA');
    fireEvent.click(usa);
    expect(screen.queryByText('John')).not.toBeInTheDocument();
    expect(screen.queryByText('David')).not.toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(usa).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(usa);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();
  });

  it('keeps a collapsed child collapsed when its parent is expanded again', () => {
    render(<ReactDataGrid data={rows} columns={columns} getRowId="id" />);
    const sales = groupByKey('country=s:USA\u001fdepartment=s:Sales');
    fireEvent.click(sales);
    expect(screen.queryByText('John')).not.toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();

    const usa = groupByKey('country=s:USA');
    fireEvent.click(usa);
    expect(screen.queryByText('David')).not.toBeInTheDocument();
    fireEvent.click(usa);
    expect(screen.queryByText('John')).not.toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();
  });

  it('groups the filtered rows and keeps the full filtered count on the group', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[{ field: 'country', rowGroup: true }, { field: 'name' }, { field: 'status' }]}
        getRowId="id"
        defaultFilters={[{ columnId: 'status', operator: 'equals', value: 'Active' }]}
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    expect(screen.queryByText('David')).not.toBeInTheDocument();
    const usa = groupByKey('country=s:USA');
    expect(usa.querySelector('.aits-group-count')).toHaveTextContent('(2)');
    expect(rowIdsAfter(usa)).toEqual(['1', '2']);
  });

  it('paginates grouped rows without shrinking the group count', () => {
    render(
      <ReactDataGrid
        data={rows.filter((row) => row.country === 'USA')}
        columns={[{ field: 'country', rowGroup: true }, { field: 'name' }]}
        getRowId="id"
        defaultPageSize={2}
        pageSizeOptions={[2, 10]}
      />,
    );
    expect(document.querySelector('.aits-group-count')).toHaveTextContent('(3)');
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.queryByText('Sarah')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(document.querySelector('.aits-group-count')).toBeNull();
  });

  it('groups from the column menu and returns to a flat grid when grouping is removed', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[
          { field: 'country' },
          { field: 'department' },
          { field: 'name' },
        ]}
        getRowId="id"
        enableRowGrouping
      />,
    );
    expect(document.querySelector('[data-group]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Country column options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Group by this column' }));
    expect(groupLabels()).toEqual(['India', 'USA', '(Blank)']);

    fireEvent.click(screen.getByRole('button', { name: 'Department column options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Group by this column' }));
    expect(groupLabels()).toContain('Sales');
    expect(groupLabels()).toContain('Support');

    fireEvent.click(screen.getByRole('button', { name: 'Country column options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ungroup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Department column options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ungroup' }));
    expect(document.querySelector('[data-group]')).toBeNull();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
  });

  it('groups by dragging a column header onto the row group bar and removes it from the chip', () => {
    render(
      <ReactDataGrid
        data={rows}
        columns={[
          { field: 'country' },
          { field: 'department' },
          { field: 'name' },
        ]}
        getRowId="id"
        enableRowGrouping
      />,
    );
    const panel = screen.getByRole('region', { name: 'Row groups' });
    expect(panel).toHaveTextContent('Drag here to set row groups');
    expect(document.querySelector('[data-group]')).toBeNull();

    const header = screen.getByRole('columnheader', { name: /Country/ });
    const dataTransfer = createDragData();
    fireEvent.dragStart(header, { dataTransfer });
    fireEvent.dragOver(panel, { dataTransfer });
    fireEvent.drop(panel, { dataTransfer });

    expect(groupLabels()).toEqual(['India', 'USA', '(Blank)']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Country from grouping' }));
    expect(document.querySelector('[data-group]')).toBeNull();
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});

function createDragData(): DragEvent['dataTransfer'] {
  const store = new Map<string, string>();
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData(type: string, value: string) {
      store.set(type, value);
    },
    getData(type: string) {
      return store.get(type) ?? '';
    },
    types: ['application/x-aits-grid-column', 'text/plain'],
  } as unknown as DragEvent['dataTransfer'];
}
