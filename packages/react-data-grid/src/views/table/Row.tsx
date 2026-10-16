import { memo, type CSSProperties, type MouseEvent } from 'react';
import { POS_COL, POS_ROW } from '../../a11y/useRovingFocus';
import type { EffectiveColumn } from '../../core/columnState';
import { useConditionalFormats } from '../../conditional/FormatContext';
import { useGrid } from '../../state/GridContext';
import { isInteractiveTarget } from '../cellContent';
import { SelectCheckbox } from '../SelectCheckbox';
import { Cell } from './Cell';

export interface RowProps {
  rowIndex: number;
  /** Roving-focus row number (header is 0). */
  focusRow: number;
  ariaRowIndex: number;
  columns: EffectiveColumn[];
  cellStyles: (CSSProperties | undefined)[];
  selectStyle?: CSSProperties;
  /** Column (roving index) that holds the tab stop in this row, or -1. */
  activeCol: number;
}

/** Memoized so scrolling re-renders only rows that enter the window. */
export const Row = memo(function Row({
  rowIndex,
  focusRow,
  ariaRowIndex,
  columns,
  cellStyles,
  selectStyle,
  activeCol,
}: RowProps) {
  const itemProps = (col: number) => ({
    [POS_ROW]: focusRow,
    [POS_COL]: col,
    tabIndex: col === activeCol ? 0 : -1,
  });
  const ctx = useGrid();
  const formats = useConditionalFormats(rowIndex);
  const { selection } = ctx;
  const id = ctx.rowIds[rowIndex]!;
  const hasSelect = selection.mode !== 'none';
  const selected = selection.selected.has(id);
  const selectable = selection.isSelectable(rowIndex);

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target, event.currentTarget)) return;
    if (hasSelect && event.shiftKey && selection.mode === 'multi') {
      selection.toggleRow(rowIndex, { range: true });
      return;
    }
    if (hasSelect && (event.ctrlKey || event.metaKey)) {
      selection.toggleRow(rowIndex);
      return;
    }
    ctx.activateRow(rowIndex, event);
  };

  const offset = hasSelect ? 1 : 0;
  return (
    <div
      role="row"
      className="aits-row"
      aria-rowindex={ariaRowIndex}
      aria-selected={hasSelect ? selected : undefined}
      aria-disabled={hasSelect && !selectable ? true : undefined}
      data-selected={selected || undefined}
      data-formatted={formats.rowStyle ? true : undefined}
      data-row-id={id}
      style={formats.rowStyle}
      onClick={onClick}
    >
      {hasSelect && (
        <div
          role="gridcell"
          className="aits-cell aits-select-cell"
          aria-colindex={1}
          data-pinned="start"
          data-formatted={formats.rowStyle ? true : undefined}
          style={formats.rowStyle ? { ...selectStyle, ...formats.rowStyle } : selectStyle}
          {...itemProps(0)}
        >
          <SelectCheckbox
            checked={selected}
            disabled={!selectable}
            label={selected ? ctx.messages.deselectRow : ctx.messages.selectRow}
            onToggle={(e) => selection.toggleRow(rowIndex, { range: e.shiftKey })}
          />
        </div>
      )}
      {columns.map((column, i) => (
        <Cell
          key={column.id}
          rowIndex={rowIndex}
          column={column}
          ariaColIndex={i + 1 + offset}
          itemProps={itemProps(i + offset)}
          style={cellStyles[i]}
          formatStyle={formats.mergedCellStyle(column.id)}
        />
      ))}
    </div>
  );
});
