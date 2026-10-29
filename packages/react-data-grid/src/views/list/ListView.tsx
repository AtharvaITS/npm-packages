import { useMemo, useRef, type CSSProperties } from 'react';
import { POS_COL, POS_ROW, useRovingFocus } from '../../a11y/useRovingFocus';
import type { DisplayItem, GroupDisplayItem } from '../../core/group';
import { useGrid } from '../../state/GridContext';
import { useMeasuredItemSize } from '../../virtual/useMeasuredItemSize';
import { useVirtualRows } from '../../virtual/useVirtualRows';
import { GroupSummary } from '../GroupSummary';
import { ListItem } from './ListItem';

/** List view: stacked items; `list` semantics, or `listbox` when selection is on. */
export function ListView() {
  const ctx = useGrid();
  const { displayItems, visibleColumns, titleColumn, subtitleColumn, imageColumn, selection } =
    ctx;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = ctx.pagination === 'scroll';
  const count = displayItems.length;
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
      const item = displayItems[pos.row];
      if (!item) return;
      switch (item.kind) {
        case 'group':
          ctx.toggleGroup(item.key);
          return;
        case 'data':
          ctx.activateRow(item.index, event);
          return;
        default: {
          const _exhaustive: never = item;
          return _exhaustive;
        }
      }
    },
    onToggle: (pos, event) => {
      const item = displayItems[pos.row];
      if (!item) return;
      switch (item.kind) {
        case 'group':
          ctx.toggleGroup(item.key);
          return;
        case 'data':
          if (hasSelect) selection.toggleRow(item.index, { range: event.shiftKey });
          return;
        default: {
          const _exhaustive: never = item;
          return _exhaustive;
        }
      }
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
    const item = displayItems[p]!;
    const tabbable = roving.active.row === p || (!activeRendered && p === start);
    items.push(
      renderListEntry(item, p, tabbable),
    );
  }

  function renderListEntry(item: DisplayItem, position: number, tabbable: boolean) {
    switch (item.kind) {
      case 'group':
        return (
          <ListGroup
            key={`group:${item.key}`}
            item={item}
            focusRow={position}
            tabbable={tabbable}
          />
        );
      case 'data':
        return (
          <ListItem
            key={ctx.rowIds[item.index] ?? position}
            rowIndex={item.index}
            fieldColumns={fieldColumns}
            focusRow={position}
            tabbable={tabbable}
            position={ctx.rowOffset + position + 1}
            setSize={ctx.displayTotal}
          />
        );
      default: {
        const _exhaustive: never = item;
        return _exhaustive;
      }
    }
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

function ListGroup({
  item,
  focusRow,
  tabbable,
}: {
  item: GroupDisplayItem;
  focusRow: number;
  tabbable: boolean;
}) {
  const ctx = useGrid();
  return (
    <div
      role="presentation"
      className="aits-list-item aits-group-banner"
      data-group="true"
      data-group-key={item.key}
      aria-expanded={item.expanded}
      style={{ paddingInlineStart: `calc(0.875rem + ${item.depth * 16}px)` }}
      {...{ [POS_ROW]: focusRow, [POS_COL]: 0, tabIndex: tabbable ? 0 : -1 }}
      onClick={() => ctx.toggleGroup(item.key)}
    >
      <GroupSummary item={item} indent={false} />
    </div>
  );
}
