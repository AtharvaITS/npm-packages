import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { applyColumnState, type EffectiveColumn } from '../../src/core/columnState';
import { defaultMessages } from '../../src/i18n/messages';
import type { GridContextValue } from '../../src/state/GridContext';
import {
  buildCardContext,
  getCellParts,
  isInteractiveTarget,
  isSafeImageSrc,
} from '../../src/views/cellContent';
import type { ColumnDef } from '../../src/types';

function column(def: ColumnDef, row: Record<string, unknown>): EffectiveColumn {
  return applyColumnState(resolveColumns([def], [row]), []).ordered[0]!;
}

function grid(
  rows: Record<string, unknown>[],
  columns: EffectiveColumn[],
  selected: string[] = [],
): GridContextValue {
  const toggleRow = vi.fn();
  return {
    rows,
    rowIds: rows.map((_, index) => String(index)),
    columns,
    visibleColumns: columns.filter((item) => !item.hidden),
    messages: defaultMessages,
    formatOptions: { locale: 'en-US', messages: defaultMessages },
    selection: {
      selected: new Set(selected),
      toggleRow,
      mode: 'multi',
      isSelectable: () => true,
      headerState: 'none',
      selectAll() {},
      clear() {},
      selectableCount: rows.length,
    },
  } as unknown as GridContextValue;
}

describe('isSafeImageSrc', () => {
  it('accepts http, data-image, blob and relative sources', () => {
    expect(isSafeImageSrc('https://x.test/a.png')).toBe(true);
    expect(isSafeImageSrc(' http://x.test/a.jpg ')).toBe(true);
    expect(isSafeImageSrc('data:image/svg+xml,abc')).toBe(true);
    expect(isSafeImageSrc('blob:https://x.test/id')).toBe(true);
    expect(isSafeImageSrc('/photos/a.png')).toBe(true);
    expect(isSafeImageSrc('./a.png')).toBe(true);
    expect(isSafeImageSrc('../a.png')).toBe(true);
  });

  it('rejects empty values and non-image schemes', () => {
    expect(isSafeImageSrc('')).toBe(false);
    expect(isSafeImageSrc('   ')).toBe(false);
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('data:text/html,hi')).toBe(false);
    expect(isSafeImageSrc(null)).toBe(false);
    expect(isSafeImageSrc(1)).toBe(false);
  });
});

describe('getCellParts', () => {
  it('renders booleans, safe images and formatted text', () => {
    const row = { name: 'Ada', active: true, photo: 'https://x.test/a.png' };
    const ctx = grid([row], [
      column({ field: 'name' }, row),
      column({ field: 'active', type: 'boolean' }, row),
      column({ field: 'photo', type: 'image' }, row),
    ]);
    const name = getCellParts(ctx, 0, ctx.columns[0]!, 'table');
    expect(name.formatted).toBe('Ada');
    expect(name.custom).toBe(false);

    const active = render(<div>{getCellParts(ctx, 0, ctx.columns[1]!, 'table').content}</div>);
    expect(active.container.querySelector('.aits-bool-true')).not.toBeNull();
    expect(active.container.querySelector('.aits-visually-hidden')).toHaveTextContent('Yes');

    const photo = render(<div>{getCellParts(ctx, 0, ctx.columns[2]!, 'grid').content}</div>);
    expect(photo.container.querySelector('img')).toHaveAttribute('src', 'https://x.test/a.png');
  });

  it('does not render an unsafe image, and uses text when an image column has format', () => {
    const row = { photo: 'javascript:alert(1)' };
    const unsafe = column({ field: 'photo', type: 'image' }, row);
    const ctx = grid([row], [unsafe]);
    expect(getCellParts(ctx, 0, unsafe, 'table').content).toBeNull();

    const formatted = column({ field: 'photo', type: 'image', format: () => 'pic' }, row);
    const text = render(
      <div>{getCellParts(grid([row], [formatted]), 0, formatted, 'table').content}</div>,
    );
    expect(text.container.querySelector('img')).toBeNull();
    expect(text.container).toHaveTextContent('pic');
  });

  it('uses custom render output and reports a throwing renderer as empty', () => {
    const row = { name: 'Ada' };
    const custom = column(
      {
        field: 'name',
        render: ({ selected, formattedValue }) => (
          <em>
            {formattedValue}:{selected ? 'on' : 'off'}
          </em>
        ),
      },
      row,
    );
    const view = render(
      <div>{getCellParts(grid([row], [custom], ['0']), 0, custom, 'list').content}</div>,
    );
    expect(view.container).toHaveTextContent('Ada:on');

    const broken = column(
      {
        field: 'name',
        render: () => {
          throw new Error('render failed');
        },
      },
      row,
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const parts = getCellParts(grid([row], [broken]), 0, broken, 'table');
    expect(parts.content).toBeNull();
    expect(parts.custom).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('shows a blank cell when a value getter throws', () => {
    const row = { name: 'Ada' };
    const failing = column(
      {
        field: 'name',
        valueGetter: () => {
          throw new Error('bad value');
        },
      },
      row,
    );
    const parts = getCellParts(grid([row], [failing]), 0, failing, 'table');
    expect(parts.value).toBeUndefined();
    expect(parts.formatted).toBe('');
  });
});

describe('buildCardContext', () => {
  it('exposes fields and toggles the row selection', () => {
    const row = { name: 'Ada', city: 'London' };
    const columns = [
      column({ field: 'name' }, row),
      column({ field: 'city' }, row),
    ];
    const ctx = grid([row], columns, ['0']);
    const card = buildCardContext(ctx, 0, columns, 'grid');
    expect(card).toMatchObject({ row, rowId: '0', selected: true });
    expect(card.fields.map((field) => field.formattedValue)).toEqual(['Ada', 'London']);
    card.toggleSelected();
    expect(ctx.selection.toggleRow).toHaveBeenCalledWith(0);
  });
});

describe('isInteractiveTarget', () => {
  it('detects controls inside a cell and ignores plain text', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    const label = document.createElement('span');
    label.textContent = 'Save';
    button.appendChild(label);
    const text = document.createTextNode('hi');
    button.appendChild(text);
    const link = document.createElement('a');
    link.href = 'https://example.test';
    const plain = document.createElement('a');
    const input = document.createElement('input');
    const role = document.createElement('div');
    role.setAttribute('role', 'button');
    container.append(button, link, plain, input, role);

    expect(isInteractiveTarget(label, container)).toBe(true);
    expect(isInteractiveTarget(text, container)).toBe(true);
    expect(isInteractiveTarget(link, container)).toBe(true);
    expect(isInteractiveTarget(input, container)).toBe(true);
    expect(isInteractiveTarget(role, container)).toBe(true);
    expect(isInteractiveTarget(plain, container)).toBe(false);
    expect(isInteractiveTarget(container, container)).toBe(false);
    expect(isInteractiveTarget(null, container)).toBe(false);
    expect(isInteractiveTarget(document.createElement('span'), container)).toBe(false);
  });
});
