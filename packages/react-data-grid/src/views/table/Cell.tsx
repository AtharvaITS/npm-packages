import type { CSSProperties } from 'react';
import type { EffectiveColumn } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import { getCellParts } from '../cellContent';

export interface CellProps {
  rowIndex: number;
  column: EffectiveColumn;
  ariaColIndex: number;
  itemProps: Record<string, unknown>;
  style?: CSSProperties;
}

/** One table cell. Values render as text nodes (never HTML) unless `render` is supplied (FR-006). */
export function Cell({ rowIndex, column, ariaColIndex, itemProps, style }: CellProps) {
  const ctx = useGrid();
  const parts = getCellParts(ctx, rowIndex, column, 'table');
  return (
    <div
      role="gridcell"
      className="aits-cell"
      aria-colindex={ariaColIndex}
      data-align={column.align}
      data-type={column.type}
      data-pinned={column.pinned ?? undefined}
      title={
        !parts.custom && parts.formatted && column.type !== 'image' ? parts.formatted : undefined
      }
      style={style}
      {...itemProps}
    >
      {parts.content}
    </div>
  );
}
