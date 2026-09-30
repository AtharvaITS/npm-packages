import { createColumns, type ColumnDef } from '@atharvaits/react-data-grid';
import type { Employee } from '../data/sample-50';
import { StatusBadge } from './StatusBadge';

/** Example column definitions for the 50 sample records (US6). */
export function employeeColumns(options: { statusBadge: boolean }): ColumnDef<Employee>[] {
  return createColumns<Employee>([
    {
      field: 'avatar',
      header: 'Photo',
      type: 'image',
      width: 72,
      sortable: false,
      filterable: false,
      hideable: true,
    },
    { field: 'name', header: 'Name', width: 200, pinned: 'start' },
    { field: 'id', header: 'Employee ID', width: 120 },
    { field: 'department', header: 'Department', type: 'enum' },
    { field: 'role', header: 'Role', width: 200 },
    {
      field: 'salary',
      header: 'Salary',
      type: 'currency',
      formatOptions: { currency: 'USD', maximumFractionDigits: 0 },
    },
    { field: 'bonusPct', header: 'Bonus', type: 'percent' },
    {
      field: 'active',
      header: 'Status',
      type: 'boolean',
      render: options.statusBadge
        ? ({ value }) => <StatusBadge active={value === true} />
        : undefined,
    },
    { field: 'startDate', header: 'Start date', type: 'date' },
    { field: 'rating', header: 'Rating', type: 'number', width: 90 },
    { field: 'address.city', header: 'City' },
    {
      id: 'fullLocation',
      header: 'Location',
      valueGetter: (row) => `${row.address.city}, ${row.address.country}`,
      width: 220,
    },
    { field: 'email', header: 'Email', width: 240 },
    { field: 'bio', header: 'Bio', width: 260, sortable: false },
  ]);
}
