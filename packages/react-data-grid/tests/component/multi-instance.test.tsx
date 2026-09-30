import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = Object.freeze([
  Object.freeze({ id: 'a', name: 'Zed' }),
  Object.freeze({ id: 'b', name: 'Amy' }),
]) as readonly { id: string; name: string }[];

describe('multiple instances (FR-047)', () => {
  it('keep independent sort, search and selection', () => {
    const { container } = render(
      <>
        <div data-testid="one">
          <ReactDataGrid
            data={rows}
            getRowId="id"
            selectionMode="multi"
            persistStateKey="one"
            searchDebounceMs={0}
          />
        </div>
        <div data-testid="two">
          <ReactDataGrid
            data={rows}
            getRowId="id"
            selectionMode="multi"
            persistStateKey="two"
            searchDebounceMs={0}
          />
        </div>
      </>,
    );
    const [one, two] = Array.from(container.querySelectorAll('.aits-root')) as HTMLElement[];
    fireEvent.click(within(one!).getByRole('button', { name: 'Name' }));
    fireEvent.click(
      within(one!.querySelector('[data-row-id="a"]') as HTMLElement).getByRole('checkbox'),
    );
    fireEvent.change(within(two!).getByRole('searchbox'), { target: { value: 'amy' } });

    const names = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('.aits-tbody .aits-row')).map(
        (r) => r.children[2]!.textContent,
      );
    expect(names(one!)).toEqual(['Amy', 'Zed']);
    expect(names(two!)).toEqual(['Amy']);
    expect(within(one!).getByText('1 selected')).toBeInTheDocument();
    expect(within(two!).queryByText(/selected/)).toBeNull();
    expect((within(one!).getByRole('searchbox') as HTMLInputElement).value).toBe('');
    // The same frozen array was shared and never mutated.
    expect(rows.map((r) => r.name)).toEqual(['Zed', 'Amy']);
  });
});
