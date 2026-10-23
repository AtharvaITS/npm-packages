import type { CSSProperties, MouseEvent } from 'react';
import { useConditionalFormat } from '../../conditional/FormatContext';
import { textAlignmentCellStyle } from '../../conditional/textAlignment';
import type { EffectiveColumn } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import { CellEditor, isCellEditing, openCellEditor } from '../CellEditor';
import { getCellParts } from '../cellContent';

export interface CellProps {
  rowIndex: number;
  column: EffectiveColumn;
  ariaColIndex: number;
  itemProps: Record<string, unknown>;
  style?: CSSProperties;
  /** Conditional formatting for this cell. Omitted when no rule matches. */
  formatStyle?: CSSProperties;
}

/** One table cell. Values render as text nodes (never HTML) unless `render` is supplied (FR-006). */
export function Cell({ rowIndex, column, ariaColIndex, itemProps, style, formatStyle }: CellProps) {
  const ctx = useGrid();
  const { textAlignment } = useConditionalFormat();
  const alignStyle = textAlignmentCellStyle(textAlignment);
  const parts = getCellParts(ctx, rowIndex, column, 'table');
  const editing = isCellEditing(ctx.editing, ctx.rowIds[rowIndex], column.id);
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    openCellEditor(event, ctx.startEdit, rowIndex, column.id);
  };
  return (
    <div
      role="gridcell"
      className="aits-cell"
      aria-colindex={ariaColIndex}
      data-align={column.align}
      data-type={column.type}
      data-pinned={column.pinned ?? undefined}
      data-formatted={formatStyle ? true : undefined}
      title={
        editing
          ? undefined
          : !parts.custom && parts.formatted && column.type !== 'image'
            ? parts.formatted
            : undefined
      }
      style={
        alignStyle || formatStyle ? { ...style, ...formatStyle, ...alignStyle } : style
      }
      onDoubleClick={onDoubleClick}
      {...itemProps}
    >
      {editing ? (
        <CellEditor column={column} value={parts.value} formatted={parts.formatted} />
      ) : (
        parts.content
      )}
    </div>
  );
}
