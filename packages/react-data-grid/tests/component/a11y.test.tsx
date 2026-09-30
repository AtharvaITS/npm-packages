import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = [
  { id: 'a', name: 'Ada', age: 36, active: true, avatar: 'https://example.test/a.png' },
  { id: 'b', name: 'Alan', age: 41, active: false, avatar: 'https://example.test/b.png' },
];

// jsdom cannot compute colors, so contrast is covered by the Playwright axe run (T064).
const axeOptions = { rules: { 'color-contrast': { enabled: false } } };

describe('accessibility (FR-042, FR-043)', () => {
  for (const view of ['table', 'grid', 'list'] as const) {
    for (const colorScheme of ['light', 'dark'] as const) {
      for (const selectionMode of ['none', 'multi'] as const) {
        it(`${view} view, ${colorScheme}, selection ${selectionMode}: no axe violations`, async () => {
          const { container } = render(
            <main>
              <ReactDataGrid
                data={rows}
                getRowId="id"
                defaultView={view}
                theme={{ colorScheme }}
                selectionMode={selectionMode}
                aria-label="People"
              />
            </main>,
          );
          expect(await axe(container, axeOptions)).toHaveNoViolations();
        });
      }
    }
  }

  it('empty state has no axe violations', async () => {
    const { container } = render(
      <main>
        <ReactDataGrid data={[]} />
      </main>,
    );
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it('exposes grid row/column counts and positions', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ i, sq: i * i }));
    render(<ReactDataGrid data={many} defaultPageSize={10} pageSizeOptions={[10]} />);
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-rowcount', '31');
    expect(grid).toHaveAttribute('aria-colcount', '2');
    const rowsEls = screen.getAllByRole('row');
    expect(rowsEls[0]).toHaveAttribute('aria-rowindex', '1');
    expect(rowsEls[1]).toHaveAttribute('aria-rowindex', '2');
    expect(screen.getAllByRole('gridcell')[1]).toHaveAttribute('aria-colindex', '2');
  });

  it('announces the result count in a polite live region', async () => {
    render(<ReactDataGrid data={rows} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
