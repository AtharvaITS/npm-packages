import { useMemo, useRef, type CSSProperties } from 'react';
import { useRovingFocus } from '../../a11y/useRovingFocus';
import { useGrid } from '../../state/GridContext';
import { useMeasuredItemSize } from '../../virtual/useMeasuredItemSize';
import { useVirtualRows } from '../../virtual/useVirtualRows';
import { ListItem } from './ListItem';

/** List view: stacked items; `list` semantics, or `listbox` when selection is on. */
export function ListView() {
  const ctx = useGrid();
  const { displayIndexes, visibleColumns, titleColumn, subtitleColumn, imageColumn, selection } =
    ctx;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = ctx.pagination === 'scroll';
  const count = displayIndexes.length;
  const hasSelect = selection.mode !== 'none';

  const fieldColumns = useMemo(
    () =>
      visibleColumns
        .filter((c) => c !== titleColumn && c !== subtitleColumn && c !== imageColumn)
        .slice(0, ctx.cardFieldLimit),
    [visibleColumns, titleColumn, subtitleColumn, imageColumn, ctx.cardFieldLimit],
  );

  const itemSize = useMeasuredItemSize(scrollRef, '.aits-list-item', ctx.rowHeight * 2, [
    fieldColumns.length,
    !!imageColumn,
    count > 0,
    ctx.rowHeight,
  ]);
  const virtual = useVirtualRows({ count, itemSize, scrollRef, enabled: scroll });

  const roving = useRovingFocus({
    rowCount: count,
    colCount: 1,
    containerRef: scrollRef,
    rtl: ctx.rtl,
    pageRows: Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 600) / itemSize)),
    onEnsureVisible: (row) => scroll && virtual.scrollToIndex(row),
    onActivate: (pos, event) => {
      const rowIndex = displayIndexes[pos.row];
      if (rowIndex !== undefined) ctx.activateRow(rowIndex, event);
    },
    onToggle: (pos, event) => {
      const rowIndex = displayIndexes[pos.row];
      if (rowIndex !== undefined && hasSelect)
        selection.toggleRow(rowIndex, { range: event.shiftKey });
    },
    onKey: (_pos, event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'a' &&
        selection.mode === 'multi'
      ) {
        event.preventDefault();
        selection.selectAll();
        return true;
      }
      return false;
    },
  });

  const start = scroll ? virtual.start : 0;
  const end = scroll ? virtual.end : count;
  const activeRendered = roving.active.row >= start && roving.active.row < end;

  const items = [];
  for (let p = start; p < end; p++) {
    const rowIndex = displayIndexes[p]!;
    const tabbable = roving.active.row === p || (!activeRendered && p === start);
    items.push(
      <ListItem
        key={ctx.rowIds[rowIndex]}
        rowIndex={rowIndex}
        fieldColumns={fieldColumns}
        focusRow={p}
        tabbable={tabbable}
        position={ctx.rowOffset + p + 1}
        setSize={ctx.totalCount}
      />,
    );
  }

  const style: CSSProperties = scroll ? { height: ctx.scrollHeight ?? 600 } : {};
  return (
    <div
      ref={scrollRef}
      className="aits-list"
      role={hasSelect ? 'listbox' : 'list'}
      aria-multiselectable={selection.mode === 'multi' ? true : undefined}
      aria-label={
        ctx.props['aria-label'] ??
        (ctx.props['aria-labelledby'] || !hasSelect ? undefined : ctx.messages.viewList)
      }
      aria-labelledby={ctx.props['aria-labelledby']}
      aria-busy={ctx.loading || undefined}
      data-scroll={scroll || undefined}
      style={style}
      onKeyDown={roving.onKeyDown}
      onFocus={roving.onFocus}
    >
      <div
        className="aits-list-body"
        role="presentation"
        style={
          scroll
            ? { height: virtual.totalSize, paddingTop: virtual.offsetTop, boxSizing: 'border-box' }
            : undefined
        }
      >
        {items}
      </div>
    </div>
  );
}
