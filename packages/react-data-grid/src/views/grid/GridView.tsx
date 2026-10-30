import { useMemo, useRef, type CSSProperties } from 'react';
import { POS_COL, POS_ROW, useRovingFocus } from '../../a11y/useRovingFocus';
import type { DisplayItem, GroupDisplayItem } from '../../core/group';
import { useGrid } from '../../state/GridContext';
import { useElementSize } from '../../virtual/useElementSize';
import { useMeasuredItemSize } from '../../virtual/useMeasuredItemSize';
import { useVirtualRows } from '../../virtual/useVirtualRows';
import { GroupAggregateValues, GroupSummary } from '../GroupSummary';
import { Card } from './Card';

const GAP = 16;

/** Columns that fit: floor(width / cardMinWidth), at least 1 (FR-013). */
export function cardColumnCount(width: number, cardMinWidth: number, gap = GAP): number {
  if (!(width > 0)) return 1;
  return Math.max(1, Math.floor((width + gap) / (Math.max(1, cardMinWidth) + gap)));
}

/** Grid view: responsive cards, virtualized by visual row in scroll mode. */
export function GridView() {
  const ctx = useGrid();
  if (ctx.grouping) return <GroupedGridView />;
  return <FlatGridView />;
}

function FlatGridView() {
  const ctx = useGrid();
  const { displayIndexes, visibleColumns, titleColumn, imageColumn, selection } = ctx;
  const scrollRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(scrollRef);
  const columns = cardColumnCount(size.width, ctx.cardMinWidth);
  const scroll = ctx.pagination === 'scroll';
  const count = displayIndexes.length;
  const rowCount = Math.ceil(count / columns);

  const fieldColumns = useMemo(
    () =>
      visibleColumns
        .filter((c) => c !== titleColumn && c !== imageColumn)
        .slice(0, ctx.cardFieldLimit),
    [visibleColumns, titleColumn, imageColumn, ctx.cardFieldLimit],
  );

  const estimate = (imageColumn ? 140 : 0) + 56 + fieldColumns.length * 22 + GAP;
  const itemSize = useMeasuredItemSize(scrollRef, '.aits-grid-row', estimate, [
    columns,
    fieldColumns.length,
    !!imageColumn,
    count > 0,
  ]);
  const virtual = useVirtualRows({
    count: rowCount,
    itemSize,
    scrollRef,
    enabled: scroll,
    initialCount: 12,
  });

  const roving = useRovingFocus({
    rowCount,
    colCount: columns,
    itemCount: count,
    containerRef: scrollRef,
    rtl: ctx.rtl,
    pageRows: Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 600) / itemSize)),
    onEnsureVisible: (row) => scroll && virtual.scrollToIndex(row),
    onActivate: (pos, event) => {
      const rowIndex = displayIndexes[pos.row * columns + pos.col];
      if (rowIndex !== undefined) ctx.activateRow(rowIndex, event);
    },
    onToggle: (pos, event) => {
      const rowIndex = displayIndexes[pos.row * columns + pos.col];
      if (rowIndex !== undefined && selection.mode !== 'none') {
        selection.toggleRow(rowIndex, { range: event.shiftKey });
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
  const end = scroll ? virtual.end : rowCount;
  const activeRendered = roving.active.row >= start && roving.active.row < end;
  const rowOffsetRows = Math.floor(ctx.rowOffset / columns);

  const rows = [];
  for (let r = start; r < end; r++) {
    const cards = [];
    for (let c = 0; c < columns; c++) {
      const p = r * columns + c;
      if (p >= count) break;
      const rowIndex = displayIndexes[p]!;
      const tabbable =
        (roving.active.row === r && roving.active.col === c) ||
        (!activeRendered && r === start && c === 0);
      cards.push(
        <Card
          key={ctx.rowIds[rowIndex]}
          rowIndex={rowIndex}
          fieldColumns={fieldColumns}
          focusRow={r}
          focusCol={c}
          tabbable={tabbable}
          ariaColIndex={c + 1}
        />,
      );
    }
    rows.push(
      <div
        key={r}
        role="row"
        className="aits-grid-row"
        aria-rowindex={rowOffsetRows + r + 1}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cards}
      </div>,
    );
  }

  const style: CSSProperties = scroll ? { height: ctx.scrollHeight ?? 600 } : {};
  return (
    <div
      ref={scrollRef}
      className="aits-grid"
      role="grid"
      aria-rowcount={Math.ceil(ctx.totalCount / columns)}
      aria-colcount={columns}
      aria-label={ctx.props['aria-label']}
      aria-labelledby={ctx.props['aria-labelledby']}
      aria-multiselectable={selection.mode === 'multi' ? true : undefined}
      aria-busy={ctx.loading || undefined}
      data-scroll={scroll || undefined}
      data-columns={columns}
      style={style}
      onKeyDown={roving.onKeyDown}
      onFocus={roving.onFocus}
    >
      <div
        className="aits-grid-body"
        style={
          scroll
            ? { height: virtual.totalSize, paddingTop: virtual.offsetTop, boxSizing: 'border-box' }
            : undefined
        }
      >
        {rows}
      </div>
    </div>
  );
}

/** One group header or one card per row, so the hierarchy stays intact. */
function GroupedGridView() {
  const ctx = useGrid();
  const { displayItems, visibleColumns, titleColumn, imageColumn, selection } = ctx;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = ctx.pagination === 'scroll';
  const count = displayItems.length;
  const hasSelect = selection.mode !== 'none';

  const fieldColumns = useMemo(
    () =>
      visibleColumns
        .filter((column) => column !== titleColumn && column !== imageColumn)
        .slice(0, ctx.cardFieldLimit),
    [visibleColumns, titleColumn, imageColumn, ctx.cardFieldLimit],
  );

  const estimate = ctx.rowHeight;
  const itemSize = useMeasuredItemSize(scrollRef, '.aits-grid-row', estimate, [
    fieldColumns.length,
    !!imageColumn,
    count > 0,
  ]);
  const virtual = useVirtualRows({
    count,
    itemSize,
    scrollRef,
    enabled: scroll,
    initialCount: 12,
  });

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
  const rows = [];
  for (let p = start; p < end; p++) {
    const item = displayItems[p]!;
    const tabbable = roving.active.row === p || (!activeRendered && p === start);
    rows.push(
      <GroupedGridRow
        key={item.kind === 'group' ? `group:${item.key}` : (ctx.rowIds[item.index] ?? p)}
        item={item}
        fieldColumns={fieldColumns}
        focusRow={p}
        tabbable={tabbable}
        ariaRowIndex={ctx.rowOffset + p + 1}
      />,
    );
  }

  const style: CSSProperties = scroll ? { height: ctx.scrollHeight ?? 600 } : {};
  return (
    <div
      ref={scrollRef}
      className="aits-grid"
      role="grid"
      aria-rowcount={ctx.displayTotal}
      aria-colcount={1}
      aria-label={ctx.props['aria-label']}
      aria-labelledby={ctx.props['aria-labelledby']}
      aria-multiselectable={selection.mode === 'multi' ? true : undefined}
      aria-busy={ctx.loading || undefined}
      data-scroll={scroll || undefined}
      data-grouped="true"
      style={style}
      onKeyDown={roving.onKeyDown}
      onFocus={roving.onFocus}
    >
      <div
        className="aits-grid-body"
        style={
          scroll
            ? { height: virtual.totalSize, paddingTop: virtual.offsetTop, boxSizing: 'border-box' }
            : undefined
        }
      >
        {rows}
      </div>
    </div>
  );
}

function GroupedGridRow({
  item,
  fieldColumns,
  focusRow,
  tabbable,
  ariaRowIndex,
}: {
  item: DisplayItem;
  fieldColumns: ReturnType<typeof useGrid>['visibleColumns'];
  focusRow: number;
  tabbable: boolean;
  ariaRowIndex: number;
}) {
  switch (item.kind) {
    case 'group':
      return (
        <div role="row" className="aits-grid-row" aria-rowindex={ariaRowIndex}>
          <GridGroup item={item} focusRow={focusRow} tabbable={tabbable} />
        </div>
      );
    case 'data':
      return (
        <div
          role="row"
          className="aits-grid-row"
          aria-rowindex={ariaRowIndex}
          style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
        >
          <Card
            rowIndex={item.index}
            fieldColumns={fieldColumns}
            focusRow={focusRow}
            focusCol={0}
            tabbable={tabbable}
            ariaColIndex={1}
          />
        </div>
      );
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function GridGroup({
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
      role="gridcell"
      className="aits-group-banner"
      data-group="true"
      data-group-key={item.key}
      aria-expanded={item.expanded}
      aria-colindex={1}
      style={{ paddingInlineStart: `calc(0.875rem + ${item.depth * 16}px)` }}
      {...{ [POS_ROW]: focusRow, [POS_COL]: 0, tabIndex: tabbable ? 0 : -1 }}
      onClick={() => ctx.toggleGroup(item.key)}
    >
      <GroupSummary item={item} indent={false} />
      <GroupAggregateValues item={item} />
    </div>
  );
}
