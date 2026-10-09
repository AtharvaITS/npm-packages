import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useRovingFocus, type Position } from '../../a11y/useRovingFocus';
import type { EffectiveColumn } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import { useIsomorphicLayoutEffect } from '../../state/useIsomorphicLayoutEffect';
import { useElementSize } from '../../virtual/useElementSize';
import { useVirtualRows } from '../../virtual/useVirtualRows';
import { SelectCheckbox } from '../SelectCheckbox';
import type { DisplayItem } from '../../core/group';
import { HeaderCell } from './HeaderCell';
import { GroupRow } from './GroupRow';
import { Row } from './Row';
import { useColumnReorder } from './useColumnReorder';
import { useColumnResize } from './useColumnResize';

const SELECT_WIDTH = 44;
const KEYBOARD_RESIZE_STEP = 10;

/** Table view: ARIA grid with sticky header, pinned columns and optional virtualization. */
export function TableView() {
  const ctx = useGrid();
  const { visibleColumns, displayItems, selection, columnActions, messages, rtl } = ctx;
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(ctx.rowHeight);
  const hasSelect = selection.mode !== 'none';
  const offset = hasSelect ? 1 : 0;
  const colCount = visibleColumns.length + offset;
  const scroll = ctx.pagination === 'scroll';

  useIsomorphicLayoutEffect(() => {
    const h = headerRef.current?.offsetHeight;
    if (h && h !== headerHeight) setHeaderHeight(h);
  });

  const resize = useColumnResize({
    rtl,
    onCommit: columnActions.setWidth,
    clamp: (id, width) => {
      const c = visibleColumns.find((x) => x.id === id);
      return c ? Math.min(c.maxWidth, Math.max(c.minWidth, width)) : width;
    },
  });
  const reorder = useColumnReorder({
    enabled: columnActions.canReorder,
    onMove: columnActions.move,
  });

  // Column widths (px), grid template and sticky offsets for pinned columns.
  // Flexible columns grow proportionally to fill the container (no `fr` tracks:
  // with max-content sizing they would all grow to the widest cell's content).
  const containerSize = useElementSize(scrollRef);
  const containerWidth = containerSize.width;
  const layout = useMemo(() => {
    const base = visibleColumns.map((c) =>
      resize.draft && resize.draft.id === c.id ? resize.draft.width : c.layoutWidth,
    );
    const isFixed = (c: EffectiveColumn) =>
      !!c.pinned || c.fixedWidth || !!(resize.draft && resize.draft.id === c.id);
    const fixedSum =
      (hasSelect ? SELECT_WIDTH : 0) +
      visibleColumns.reduce((sum, c, i) => sum + (isFixed(c) ? base[i]! : 0), 0);
    const flexSum = visibleColumns.reduce((sum, c, i) => sum + (isFixed(c) ? 0 : base[i]!), 0);
    const factor =
      containerWidth > 0 && flexSum > 0 ? Math.max(1, (containerWidth - fixedSum) / flexSum) : 1;
    const widths = visibleColumns.map((c, i) =>
      isFixed(c)
        ? base[i]!
        : Math.min(Math.max(c.maxWidth, base[i]!), Math.floor(base[i]! * factor)),
    );
    const template = [
      ...(hasSelect ? [`${SELECT_WIDTH}px`] : []),
      ...widths.map((w) => `${w}px`),
    ].join(' ');
    const totalWidth = (hasSelect ? SELECT_WIDTH : 0) + widths.reduce((a, b) => a + b, 0);
    const styles: (CSSProperties | undefined)[] = visibleColumns.map(() => undefined);
    let start = hasSelect ? SELECT_WIDTH : 0;
    visibleColumns.forEach((c, i) => {
      if (c.pinned === 'start') {
        styles[i] = { insetInlineStart: start };
        start += widths[i]!;
      }
    });
    let end = 0;
    for (let i = visibleColumns.length - 1; i >= 0; i--) {
      const c = visibleColumns[i]!;
      if (c.pinned === 'end') {
        styles[i] = { insetInlineEnd: end };
        end += widths[i]!;
      }
    }
    return {
      template,
      totalWidth,
      widths,
      styles,
      selectStyle: { insetInlineStart: 0 } as CSSProperties,
    };
  }, [visibleColumns, hasSelect, resize.draft, containerWidth]);

  const virtual = useVirtualRows({
    count: displayItems.length,
    itemSize: ctx.rowHeight,
    scrollRef,
    enabled: scroll,
    headerOffset: headerHeight,
  });
  const viewportHeight = Math.min(
    scrollRef.current?.clientHeight || Number.POSITIVE_INFINITY,
    typeof window !== 'undefined' && window.innerHeight
      ? window.innerHeight
      : Number.POSITIVE_INFINITY,
  );
  const visibleRowCount = Math.max(
    1,
    Math.floor(
      ((Number.isFinite(viewportHeight) ? viewportHeight : 400) - headerHeight) / ctx.rowHeight,
    ),
  );

  const columnAt = (col: number): EffectiveColumn | undefined => visibleColumns[col - offset];

  const onActivate = (pos: Position, event: KeyboardEvent) => {
    if (pos.row === 0) {
      if (hasSelect && pos.col === 0) toggleAll();
      else {
        const column = columnAt(pos.col);
        if (column?.sortable) ctx.api.toggleSort(column.id, event.shiftKey);
      }
      return;
    }
    const item = displayItems[pos.row - 1];
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
  };

  const onToggle = (pos: Position, event: KeyboardEvent) => {
    if (pos.row === 0) {
      onActivate(pos, event);
      return;
    }
    const item = displayItems[pos.row - 1];
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
  };

  const onKey = (pos: Position, event: KeyboardEvent) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'a' &&
      selection.mode === 'multi'
    ) {
      event.preventDefault();
      selection.selectAll();
      return true;
    }
    if (pos.row !== 0) return false;
    const column = columnAt(pos.col);
    if (!column) return false;
    if (
      (event.altKey && event.key === 'ArrowDown') ||
      event.key === 'ContextMenu' ||
      (event.shiftKey && event.key === 'F10')
    ) {
      event.preventDefault();
      setMenuFor(column.id);
      return true;
    }
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      if (!columnActions.canResize || !column.resizable) return true;
      event.preventDefault();
      const grow = (event.key === 'ArrowRight') !== rtl;
      const current = layout.widths[visibleColumns.indexOf(column)] ?? column.layoutWidth;
      columnActions.setWidth(
        column.id,
        current + (grow ? KEYBOARD_RESIZE_STEP : -KEYBOARD_RESIZE_STEP),
      );
      return true;
    }
    return false;
  };

  const roving = useRovingFocus({
    rowCount: displayItems.length + 1,
    colCount,
    containerRef: scrollRef,
    rtl,
    pageRows: visibleRowCount,
    onEnsureVisible: (row) => {
      if (scroll && row > 0) virtual.scrollToIndex(row - 1);
    },
    onActivate,
    onToggle,
    onKey,
  });

  function toggleAll() {
    if (selection.mode !== 'multi') return;
    if (selection.headerState === 'all') selection.clear();
    else selection.selectAll();
  }

  const start = scroll ? virtual.start : 0;
  const end = scroll ? virtual.end : displayItems.length;
  const activeRendered =
    roving.active.row === 0 || (roving.active.row - 1 >= start && roving.active.row - 1 < end);
  const itemProps = (row: number, col: number) => {
    const props = roving.itemProps(row, col) as Record<string, unknown>;
    if (!activeRendered && row === 0 && col === roving.active.col) props.tabIndex = 0;
    return props;
  };

  const rows = [];
  for (let p = start; p < end; p++) {
    const item = displayItems[p]!;
    const focusRow = p + 1;
    const ariaRowIndex = ctx.rowOffset + p + 2;
    const activeCol = roving.active.row === focusRow ? roving.active.col : -1;
    rows.push(renderBodyRow(item, p, focusRow, ariaRowIndex, activeCol));
  }

  function renderBodyRow(
    item: DisplayItem,
    position: number,
    focusRow: number,
    ariaRowIndex: number,
    activeCol: number,
  ) {
    switch (item.kind) {
      case 'group':
        return (
          <GroupRow
            key={`group:${item.key}`}
            item={item}
            focusRow={focusRow}
            ariaRowIndex={ariaRowIndex}
            hasSelect={hasSelect}
            selectStyle={layout.selectStyle}
            activeCol={activeCol}
            columns={visibleColumns}
            cellStyles={layout.styles}
          />
        );
      case 'data':
        return (
          <Row
            key={ctx.rowIds[item.index] ?? position}
            rowIndex={item.index}
            focusRow={focusRow}
            ariaRowIndex={ariaRowIndex}
            columns={visibleColumns}
            cellStyles={layout.styles}
            selectStyle={layout.selectStyle}
            activeCol={activeCol}
            depth={item.depth}
          />
        );
      default: {
        const _exhaustive: never = item;
        return _exhaustive;
      }
    }
  }

  const containerStyle: CSSProperties = scroll
    ? { height: ctx.scrollHeight ?? 600 }
    : ctx.props.height !== undefined && ctx.props.height !== 'auto'
      ? { maxHeight: ctx.props.height }
      : {};

  return (
    <div
      ref={scrollRef}
      className="aits-table"
      role="grid"
      aria-rowcount={ctx.displayTotal + 1}
      aria-colcount={colCount}
      aria-label={ctx.props['aria-label']}
      aria-labelledby={ctx.props['aria-labelledby']}
      aria-multiselectable={selection.mode === 'multi' ? true : undefined}
      aria-busy={ctx.loading || undefined}
      data-scroll={scroll || undefined}
      style={containerStyle}
      onKeyDown={roving.onKeyDown}
      onFocus={roving.onFocus}
    >
      <div
        className="aits-table-inner"
        style={{ '--aits-cols': layout.template, width: layout.totalWidth } as CSSProperties}
      >
        <div role="rowgroup" className="aits-thead" ref={headerRef}>
          <div role="row" className="aits-row aits-header-row" aria-rowindex={1}>
            {hasSelect && (
              <div
                role="columnheader"
                className="aits-header-cell aits-select-cell"
                aria-colindex={1}
                data-pinned="start"
                style={layout.selectStyle}
                {...itemProps(0, 0)}
              >
                {selection.mode === 'multi' && (
                  <SelectCheckbox
                    checked={selection.headerState === 'all'}
                    indeterminate={selection.headerState === 'some'}
                    disabled={selection.selectableCount === 0}
                    label={messages.selectAll}
                    onToggle={toggleAll}
                  />
                )}
              </div>
            )}
            {visibleColumns.map((column, i) => (
              <HeaderCell
                key={column.id}
                column={column}
                ariaColIndex={i + 1 + offset}
                itemProps={itemProps(0, i + offset)}
                style={layout.styles[i]}
                menuOpen={menuFor === column.id}
                onMenuOpenChange={(open) => setMenuFor(open ? column.id : null)}
                onResizeStart={
                  columnActions.canResize && column.resizable
                    ? (e) => resize.startResize(column.id, e)
                    : undefined
                }
                dragProps={reorder.handlers(column.id, column.reorderable)}
                dropTarget={reorder.over === column.id}
                dragging={reorder.dragging === column.id}
              />
            ))}
          </div>
        </div>
        <div
          role="rowgroup"
          className="aits-tbody"
          style={
            scroll
              ? {
                  height: virtual.totalSize,
                  paddingTop: virtual.offsetTop,
                  boxSizing: 'border-box',
                }
              : undefined
          }
        >
          {rows}
        </div>
      </div>
    </div>
  );
}
