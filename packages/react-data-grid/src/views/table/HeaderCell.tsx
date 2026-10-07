import { useRef, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { useConditionalFormat } from '../../conditional/FormatContext';
import { headerLabelStyle } from '../../conditional/headerStyle';
import type { EffectiveColumn } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import { MoreIcon, SortAscIcon, SortDescIcon, SortNoneIcon } from '../icons';
import { ColumnMenu, hasColumnMenu } from './ColumnMenu';

export interface HeaderCellProps {
  column: EffectiveColumn;
  ariaColIndex: number;
  itemProps: Record<string, unknown>;
  style?: CSSProperties;
  menuOpen: boolean;
  onMenuOpenChange(open: boolean): void;
  onResizeStart?(event: PointerEvent<HTMLElement>): void;
  dragProps: Partial<{
    draggable: boolean;
    onDragStart(e: DragEvent): void;
    onDragOver(e: DragEvent): void;
    onDragLeave(e: DragEvent): void;
    onDrop(e: DragEvent): void;
    onDragEnd(e: DragEvent): void;
  }>;
  dropTarget: boolean;
  dragging: boolean;
}

export function HeaderCell({
  column,
  ariaColIndex,
  itemProps,
  style,
  menuOpen,
  onMenuOpenChange,
  onResizeStart,
  dragProps,
  dropTarget,
  dragging,
}: HeaderCellProps) {
  const ctx = useGrid();
  const { headerStyle } = useConditionalFormat();
  const menuButton = useRef<HTMLButtonElement>(null);
  const sortIndex = ctx.api.state.sort.findIndex((s) => s.columnId === column.id);
  const sortItem = sortIndex >= 0 ? ctx.api.state.sort[sortIndex] : undefined;
  const ariaSort = column.sortable
    ? sortItem
      ? sortItem.direction === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none'
    : undefined;
  const showMenu = hasColumnMenu(column, ctx);
  const multi = ctx.api.state.sort.length > 1;

  const label = (
    <span className="aits-header-label" style={headerLabelStyle(headerStyle)}>
      {column.header}
    </span>
  );
  return (
    <div
      role="columnheader"
      className="aits-header-cell"
      aria-colindex={ariaColIndex}
      aria-sort={ariaSort}
      data-align={column.align}
      data-pinned={column.pinned ?? undefined}
      data-drop-target={dropTarget || undefined}
      data-dragging={dragging || undefined}
      data-column-id={column.id}
      title={column.header}
      style={style}
      {...itemProps}
      {...dragProps}
    >
      {column.sortable ? (
        <button
          type="button"
          tabIndex={-1}
          className="aits-sort-button"
          onClick={(e) => ctx.api.toggleSort(column.id, e.shiftKey)}
        >
          {label}
          <span className="aits-sort-indicator">
            {sortItem ? (
              sortItem.direction === 'asc' ? (
                <SortAscIcon />
              ) : (
                <SortDescIcon />
              )
            ) : (
              <SortNoneIcon />
            )}
            {multi && sortItem && <span className="aits-sort-priority">{sortIndex + 1}</span>}
          </span>
        </button>
      ) : (
        <span className="aits-header-static">{label}</span>
      )}
      {showMenu && (
        <button
          ref={menuButton}
          type="button"
          tabIndex={-1}
          className="aits-icon-button aits-header-menu-button"
          aria-label={ctx.messages.columnMenu(column.header)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpenChange(!menuOpen);
          }}
        >
          <MoreIcon />
        </button>
      )}
      {onResizeStart && (
        <span
          className="aits-resize-handle"
          aria-hidden="true"
          title={ctx.messages.resizeColumn}
          onPointerDown={onResizeStart}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {showMenu && menuOpen && (
        <ColumnMenu
          column={column}
          open={menuOpen}
          onClose={() => onMenuOpenChange(false)}
          anchorRef={menuButton}
        />
      )}
    </div>
  );
}
