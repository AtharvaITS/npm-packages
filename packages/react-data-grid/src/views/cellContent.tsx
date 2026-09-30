import type { ReactNode } from 'react';
import { getColumnValue } from '../core/columns';
import type { EffectiveColumn } from '../core/columnState';
import { formatCell } from '../core/format';
import type { GridContextValue } from '../state/GridContext';
import type { CardContext, CardField, ViewType } from '../types';

const SAFE_IMAGE_SRC = /^(https?:|data:image\/|blob:|\/|\.{0,2}\/)/i;

export function isSafeImageSrc(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && SAFE_IMAGE_SRC.test(value.trim());
}

export interface CellParts {
  value: unknown;
  formatted: string;
  content: ReactNode;
  /** True when the developer's `render` produced the content. */
  custom: boolean;
}

/** Default content for a value by column type (text nodes only; never HTML, FR-006). */
function defaultContent(
  value: unknown,
  formatted: string,
  column: EffectiveColumn,
  ctx: GridContextValue,
  imageSize: 'cell' | 'none' = 'cell',
): ReactNode {
  if (column.type === 'image' && !column.format) {
    if (imageSize === 'none') return null;
    return isSafeImageSrc(value) ? (
      <img className="aits-cell-img" src={value} alt="" loading="lazy" decoding="async" />
    ) : null;
  }
  if (typeof value === 'boolean' && !column.format) {
    return (
      <span className={value ? 'aits-bool aits-bool-true' : 'aits-bool aits-bool-false'}>
        <span aria-hidden="true">{value ? '✓' : '✗'}</span>
        <span className="aits-visually-hidden">{value ? ctx.messages.yes : ctx.messages.no}</span>
      </span>
    );
  }
  return <span className="aits-cell-text">{formatted}</span>;
}

export function getCellParts<TRow>(
  ctx: GridContextValue<TRow>,
  rowIndex: number,
  column: EffectiveColumn<TRow>,
  view: ViewType,
): CellParts {
  const row = ctx.rows[rowIndex] as TRow;
  const value = getColumnValue(row, column);
  const formatted = formatCell(row, column, ctx.formatOptions);
  if (column.render) {
    const rowId = ctx.rowIds[rowIndex]!;
    let content: ReactNode = null;
    try {
      content = column.render({
        row,
        rowId,
        value,
        formattedValue: formatted,
        column: column.def,
        view,
        selected: ctx.selection.selected.has(rowId),
      });
    } catch (error) {
      content = null;
      if (typeof console !== 'undefined') console.error(error);
    }
    return { value, formatted, content, custom: true };
  }
  return {
    value,
    formatted,
    content: defaultContent(value, formatted, column as EffectiveColumn, ctx as GridContextValue),
    custom: false,
  };
}

/** Context for renderCard / renderListItem (FR-013, FR-014). */
export function buildCardContext<TRow>(
  ctx: GridContextValue<TRow>,
  rowIndex: number,
  fieldColumns: readonly EffectiveColumn<TRow>[],
  view: ViewType,
): CardContext<TRow> {
  const rowId = ctx.rowIds[rowIndex]!;
  const fields: CardField<TRow>[] = fieldColumns.map((column) => {
    const parts = getCellParts(ctx, rowIndex, column, view);
    return {
      column: column.def,
      value: parts.value,
      formattedValue: parts.formatted,
      content: parts.content,
    };
  });
  return {
    row: ctx.rows[rowIndex] as TRow,
    rowId,
    selected: ctx.selection.selected.has(rowId),
    toggleSelected: () => ctx.selection.toggleRow(rowIndex),
    fields,
  };
}

/** Clicks on interactive custom content must not activate the row. */
export function isInteractiveTarget(target: EventTarget | null, container: Element): boolean {
  let el = target as Element | null;
  while (el && el !== container) {
    if (
      el.matches?.(
        'a[href], button, input, select, textarea, label, summary, [role="button"], [role="checkbox"], [role="link"], [contenteditable="true"]',
      )
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}
