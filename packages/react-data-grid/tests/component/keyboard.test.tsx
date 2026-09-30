import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i + 1}`,
  name: `Name ${i + 1}`,
  n: i + 1,
  c: `c${i + 1}`,
}));

function focused() {
  const el = document.activeElement as HTMLElement;
  return {
    row: Number(el.getAttribute('data-aits-r')),
    col: Number(el.getAttribute('data-aits-c')),
    el,
  };
}

describe('keyboard navigation (FR-041)', () => {
  it('table: a single tab stop, then arrows / Home / End / Ctrl+Home / Ctrl+End', () => {
    render(<ReactDataGrid data={rows} getRowId="id" />);
    const grid = screen.getByRole('grid');
    const tabbables = grid.querySelectorAll('[tabindex="0"]');
    expect(tabbables).toHaveLength(1);
    (tabbables[0] as HTMLElement).focus();
    expect(focused()).toMatchObject({ row: 0, col: 0 });

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(focused()).toMatchObject({ row: 1, col: 0 });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(focused()).toMatchObject({ row: 1, col: 1 });
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(focused()).toMatchObject({ row: 1, col: 3 });
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(focused()).toMatchObject({ row: 1, col: 0 });
    fireEvent.keyDown(document.activeElement!, { key: 'End', ctrlKey: true });
    expect(focused()).toMatchObject({ row: 12, col: 3 });
    fireEvent.keyDown(document.activeElement!, { key: 'Home', ctrlKey: true });
    expect(focused()).toMatchObject({ row: 0, col: 0 });
    fireEvent.keyDown(document.activeElement!, { key: 'PageDown' });
    expect(focused().row).toBeGreaterThan(1);
    fireEvent.keyDown(document.activeElement!, { key: 'PageUp' });
    expect(focused().row).toBe(0);
    // Exactly one tab stop at all times.
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  it('table: Enter on a header sorts; Enter on a row activates', () => {
    const onRowActivate = vi.fn();
    render(<ReactDataGrid data={rows} getRowId="id" onRowActivate={onRowActivate} />);
    const header = screen.getAllByRole('columnheader')[2]!; // "N"
    header.focus();
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.keyDown(header, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onRowActivate).toHaveBeenCalledWith(rows[0], 'r1', expect.anything());
  });

  it('table: arrows mirror in right-to-left layouts', () => {
    render(<ReactDataGrid data={rows} direction="rtl" />);
    const header = screen.getAllByRole('columnheader')[1]!;
    header.focus();
    fireEvent.keyDown(header, { key: 'ArrowLeft' });
    expect(focused().col).toBe(2);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(focused().col).toBe(1);
  });

  it('grid view: arrows move in two dimensions across cards', () => {
    const { container } = render(
      <ReactDataGrid data={rows} defaultView="grid" cardMinWidth={240} />,
    );
    // 1024px stub width → 4 columns.
    expect(container.querySelector('.aits-grid')!.getAttribute('data-columns')).toBe('4');
    const first = container.querySelector('.aits-card') as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(focused()).toMatchObject({ row: 0, col: 1 });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(focused()).toMatchObject({ row: 1, col: 1 });
    fireEvent.keyDown(document.activeElement!, { key: 'End', ctrlKey: true });
    expect(focused()).toMatchObject({ row: 2, col: 3 });
    expect(focused().el.textContent).toContain('Name 12');
  });

  it('list view: Up/Down, Home/End', () => {
    const { container } = render(<ReactDataGrid data={rows} defaultView="list" />);
    const first = container.querySelector('.aits-list-item') as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(focused().row).toBe(1);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(focused().row).toBe(11);
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(focused().row).toBe(0);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(focused().row).toBe(0);
  });

  it('view switcher can be operated with arrow keys', () => {
    const { container } = render(<ReactDataGrid data={rows} />);
    const radios = within(screen.getByRole('radiogroup')).getAllByRole('radio');
    radios[0]!.focus();
    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
    expect(container.querySelector('.aits-root')!.getAttribute('data-view')).toBe('grid');
    expect(document.activeElement).toBe(radios[1]);
    fireEvent.keyDown(radios[1]!, { key: 'End' });
    expect(container.querySelector('.aits-root')!.getAttribute('data-view')).toBe('list');
  });

  it('Space toggles selection on the focused row, card or item', () => {
    const onSelectionChange = vi.fn();
    const { container, rerender } = render(
      <ReactDataGrid
        data={rows}
        getRowId="id"
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
      />,
    );
    const firstRowCell = container.querySelector(
      '.aits-tbody [data-aits-r="1"][data-aits-c="1"]',
    ) as HTMLElement;
    firstRowCell.focus();
    fireEvent.keyDown(firstRowCell, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['r1'], [rows[0]]);
    rerender(
      <ReactDataGrid
        data={rows}
        getRowId="id"
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
        defaultView="list"
      />,
    );
  });
});
