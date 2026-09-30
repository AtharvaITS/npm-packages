/**
 * Every bullet under spec.md "Edge Cases" (SC-005). Cases covered by unit
 * tests are referenced; the rest are asserted here through the component.
 *
 * Input data
 *  - missing / null / undefined data ........ here ("null and undefined data")
 *  - non-array data ......................... here ("non-array data") + normalize.test
 *  - non-record items ....................... here ("invalid items")
 *  - inconsistent field sets ................ here ("edge-case rows") + columns.test
 *  - special field names .................... here ("edge-case rows": spaces, dots, non-Latin)
 *  - nested objects / circular .............. here + format.test
 *  - unusual types (fn, symbol, bigint, NaN, Infinity) .. here + format.test
 *  - very long text ......................... here (title attribute holds full text)
 *  - markup text ............................ here + table-basic.test
 *  - numbers/dates stored as text ........... here ("declared types") + sort.test
 *  - duplicate / missing ids ................ here + normalize.test
 *  - field with zero records / defined column with no values .. here
 *  - one record / one field ................. here
 *  - 100+ fields ............................ here ("wide data")
 * Data changes and state
 *  - re-apply conditions on new data ........ here
 *  - data shrinks past current page ......... here
 *  - selected rows disappear ................ selection.test (scenario 4)
 *  - supplied data never mutated ............ here + multi-instance.test
 *  - same array re-supplied ................. here
 *  - multiple instances ..................... multi-instance.test
 * Interaction
 *  - zero matches ........................... sort-search-filter.test (no-results state)
 *  - mixed-type sort / stable ............... sort.test
 *  - rapid typing debounce .................. sort-search-filter.test (scenario 4)
 *  - page size change keeps first record .... here + paginate.test
 *  - request failure / out-of-order / unmount .. server-mode.test
 * Environment
 *  - server rendering ....................... ssr/*.test
 *  - storage unavailable .................... persist.test
 *  - zoom / high contrast ................... e2e a11y-responsive.spec (Playwright)
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';
import { edgeCaseRows, invalidItems } from '../fixtures/edge-cases';

const views = ['table', 'grid', 'list'] as const;
const modes = ['pages', 'scroll'] as const;

function warnings(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((c) => String(c[0]));
}

describe('edge cases never crash (SC-005)', () => {
  afterEach(() => vi.restoreAllMocks());

  for (const view of views) {
    for (const pagination of modes) {
      it(`edge-case rows: ${view} × ${pagination}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { container } = render(
          <ReactDataGrid
            data={edgeCaseRows()}
            getRowId="id"
            defaultView={view}
            pagination={pagination}
            selectionMode="multi"
          />,
        );
        const text = container.textContent ?? '';
        expect(text).toContain('<img src=x onerror=alert(1)>');
        expect(container.querySelector('img[src="x"]')).toBeNull();
        expect(text).toContain('[Circular]');
        expect(text).not.toContain('[object Object]');
        expect(text).not.toMatch(/\bundefined\b/);
        // Each distinct problem is reported once.
        const msgs = warnings(warn);
        expect(msgs.filter((m) => m.includes('duplicate ids'))).toHaveLength(1);
        expect(new Set(msgs).size).toBe(msgs.length);
        expect(msgs.every((m) => m.startsWith('[ReactDataGrid]'))).toBe(true);
      });

      it(`invalid items: ${view} × ${pagination}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { container } = render(
          <ReactDataGrid data={invalidItems as never} defaultView={view} pagination={pagination} />,
        );
        expect(container.textContent).toContain('Valid row three');
        expect(warnings(warn).filter((m) => m.includes('Skipped 5 invalid rows'))).toHaveLength(1);
      });
    }
  }

  it.each([null, undefined])('null and undefined data show the empty state (%s)', (data) => {
    render(<ReactDataGrid data={data} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('non-array data shows the empty state with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ReactDataGrid data={{ not: 'array' } as never} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('data must be an array'));
  });

  it('special field names display correctly', () => {
    render(<ReactDataGrid data={edgeCaseRows()} />);
    expect(screen.getByRole('columnheader', { name: /Key With Spaces/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /имя/i })).toBeInTheDocument();
    expect(screen.getByText('literal dotted key')).toBeInTheDocument();
  });

  it('long text keeps the full value in the title attribute', () => {
    const { container } = render(<ReactDataGrid data={[{ long: 'y'.repeat(5000) }]} />);
    const cell = container.querySelector('.aits-tbody .aits-cell') as HTMLElement;
    expect(cell.getAttribute('title')).toHaveLength(5000);
  });

  it('numbers and dates stored as text sort as text unless declared', () => {
    const data = [{ v: '10' }, { v: '9' }, { v: '100' }];
    const { unmount } = render(
      <ReactDataGrid data={data} defaultSort={[{ columnId: 'v', direction: 'asc' }]} />,
    );
    // Natural text order still puts 9 < 10 < 100 thanks to numeric collation.
    const cells = () =>
      Array.from(document.querySelectorAll('.aits-tbody .aits-cell')).map((c) => c.textContent);
    expect(cells()).toEqual(['9', '10', '100']);
    unmount();
    render(
      <ReactDataGrid
        data={[{ d: '2026-01-05' }, { d: '2025-12-31' }]}
        columns={[{ field: 'd', type: 'date' }]}
        defaultSort={[{ columnId: 'd', direction: 'asc' }]}
        locale="en-US"
      />,
    );
    expect(cells()).toEqual(['Dec 31, 2025', 'Jan 5, 2026']);
  });

  it('a defined column with no values shows empty cells; one record with one field renders', () => {
    const { container, unmount } = render(
      <ReactDataGrid data={[{ a: 1 }]} columns={[{ field: 'a' }, { field: 'missing' }]} />,
    );
    expect(screen.getByRole('columnheader', { name: /Missing/ })).toBeInTheDocument();
    expect(container.querySelectorAll('.aits-tbody .aits-cell')[1]!.textContent).toBe('');
    unmount();
    for (const view of views) {
      const r = render(<ReactDataGrid data={[{ only: 'value' }]} defaultView={view} />);
      expect(r.container.textContent).toContain('value');
      r.unmount();
    }
  });

  it('wide data: table shows every field; cards show at most cardFieldLimit', () => {
    const row: Record<string, number> = {};
    for (let i = 0; i < 120; i++) row['f' + i] = i;
    const { unmount } = render(<ReactDataGrid data={[row]} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(120);
    unmount();
    const { container } = render(<ReactDataGrid data={[row]} defaultView="grid" />);
    expect(container.querySelectorAll('.aits-card-field')).toHaveLength(6);
  });

  it('re-applies search/sort to new data and moves to the last valid page when data shrinks', () => {
    const make = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ i, t: i % 2 ? 'odd' : 'even' }));
    const { rerender } = render(<ReactDataGrid data={make(100)} defaultSearch="odd" />);
    fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(screen.getByText('26–50 of 50')).toBeInTheDocument();
    rerender(<ReactDataGrid data={make(40)} defaultSearch="odd" />);
    expect(screen.getByText('1–20 of 20')).toBeInTheDocument();
  });

  it('page size change keeps the first visible record on screen', () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ i }));
    render(<ReactDataGrid data={data} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); // records 76–100
    fireEvent.change(screen.getByRole('combobox', { name: 'Rows per page' }), {
      target: { value: '50' },
    });
    expect(screen.getByText('51–100 of 100')).toBeInTheDocument();
  });

  it('never mutates the supplied data; re-supplying the same array keeps state', () => {
    const data = Object.freeze([Object.freeze({ n: 2 }), Object.freeze({ n: 1 })]);
    const { rerender, container } = render(
      <ReactDataGrid data={data} defaultSort={[{ columnId: 'n', direction: 'asc' }]} />,
    );
    rerender(<ReactDataGrid data={data} defaultSort={[{ columnId: 'n', direction: 'asc' }]} />);
    expect(
      Array.from(container.querySelectorAll('.aits-tbody .aits-cell')).map((c) => c.textContent),
    ).toEqual(['1', '2']);
    expect(data[0]!.n).toBe(2);
  });
});
