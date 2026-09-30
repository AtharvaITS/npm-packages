import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';

const twenty = Array.from({ length: 20 }, (_, i) => ({
  firstName: `Person ${i + 1}`,
  age: 20 + i,
  isActive: i % 2 === 0,
}));

function bodyRows() {
  const grid = screen.getByRole('grid');
  return within(grid).getAllByRole('row').slice(1); // minus header row
}

describe('US1: render supplied data with zero configuration', () => {
  it('shows 20 rows with humanized headers (scenario 1)', () => {
    render(<ReactDataGrid data={twenty} />);
    expect(screen.getByRole('columnheader', { name: /First Name/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Is Active/ })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(20);
    expect(screen.getByText('Person 20')).toBeInTheDocument();
  });

  it('uses the union of keys and leaves missing cells blank (scenario 2)', () => {
    render(<ReactDataGrid data={[{ a: 'x' }, { b: 'y' }, { a: null, b: undefined }]} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers.join('|')).toMatch(/A.*\|.*B/);
    const grid = screen.getByRole('grid');
    expect(grid.textContent).not.toMatch(/undefined|null/);
  });

  it('shows the empty message for [] (scenario 3)', () => {
    render(<ReactDataGrid data={[]} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('updates when new data is supplied (scenario 4)', () => {
    const { rerender } = render(<ReactDataGrid data={[{ name: 'Old' }]} />);
    expect(screen.getByText('Old')).toBeInTheDocument();
    rerender(<ReactDataGrid data={[{ name: 'New one' }, { name: 'New two' }]} />);
    expect(screen.queryByText('Old')).not.toBeInTheDocument();
    expect(screen.getByText('New two')).toBeInTheDocument();
  });

  it('renders markup as literal text (scenario 5)', () => {
    const { container } = render(<ReactDataGrid data={[{ bio: '<script>alert(1)</script>' }]} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it('formats numbers and booleans readably', () => {
    render(<ReactDataGrid data={[{ n: 1234.5, ok: true }]} locale="en-US" />);
    expect(screen.getByText('1,234.5')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('paginates by default at 25 rows per page', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ i }));
    render(<ReactDataGrid data={many} />);
    expect(bodyRows()).toHaveLength(25);
    expect(screen.getByText('1–25 of 30')).toBeInTheDocument();
  });
});
