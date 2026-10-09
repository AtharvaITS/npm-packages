import type { RefObject } from 'react';
import type { EffectiveColumn } from '../../core/columnState';
import { neighbourId } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import { Menu, type MenuItem } from '../../toolbar/Popover';
import type { Messages } from '../../types';

export function ColumnMenu({
  column,
  open,
  onClose,
  anchorRef,
}: {
  column: EffectiveColumn;
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const ctx = useGrid();
  const { messages, columnActions: actions, api, visibleColumns } = ctx;
  const items: (MenuItem | 'separator')[] = [];

  if (column.sortable) {
    const current = api.state.sort.find((s) => s.columnId === column.id);
    items.push(
      {
        label: messages.sortAscending,
        checked: current?.direction === 'asc',
        onSelect: () => api.setSort([{ columnId: column.id, direction: 'asc' }]),
      },
      {
        label: messages.sortDescending,
        checked: current?.direction === 'desc',
        onSelect: () => api.setSort([{ columnId: column.id, direction: 'desc' }]),
      },
      {
        label: messages.sortNone,
        disabled: !current,
        onSelect: () => api.setSort(api.state.sort.filter((s) => s.columnId !== column.id)),
      },
    );
  }
  if (actions.canPin) {
    if (items.length) items.push('separator');
    items.push(
      {
        label: messages.pinStart,
        checked: column.pinned === 'start',
        onSelect: () => actions.setPinned(column.id, 'start'),
      },
      {
        label: messages.pinEnd,
        checked: column.pinned === 'end',
        onSelect: () => actions.setPinned(column.id, 'end'),
      },
      {
        label: messages.unpin,
        disabled: !column.pinned,
        onSelect: () => actions.setPinned(column.id, null),
      },
    );
  }
  if (actions.canReorder && column.reorderable) {
    if (items.length) items.push('separator');
    const left = neighbourId(visibleColumns, column.id, -1);
    const right = neighbourId(visibleColumns, column.id, 1);
    items.push(
      {
        label: moveLabel(messages, 'start', ctx.rtl),
        disabled: !left,
        onSelect: () => actions.moveBy(column.id, -1),
      },
      {
        label: moveLabel(messages, 'end', ctx.rtl),
        disabled: !right,
        onSelect: () => actions.moveBy(column.id, 1),
      },
    );
  }
  if (actions.canHide && column.hideable) {
    if (items.length) items.push('separator');
    items.push({
      label: messages.hideColumn,
      disabled: visibleColumns.length <= 1,
      onSelect: () => actions.setHidden(column.id, true),
    });
  }
  if (actions.canGroup && column.groupable) {
    if (items.length) items.push('separator');
    if (column.rowGroup) {
      const levels = ctx.columns
        .filter((candidate) => candidate.rowGroup)
        .sort((a, b) => (a.rowGroupIndex ?? 0) - (b.rowGroupIndex ?? 0));
      const index = levels.findIndex((candidate) => candidate.id === column.id);
      items.push(
        {
          label: messages.ungroupColumn,
          onSelect: () => actions.setRowGroup(column.id, false),
        },
        {
          label: messages.moveGroupUp,
          disabled: index <= 0,
          onSelect: () => actions.moveGroup(column.id, -1),
        },
        {
          label: messages.moveGroupDown,
          disabled: index < 0 || index >= levels.length - 1,
          onSelect: () => actions.moveGroup(column.id, 1),
        },
      );
    } else {
      items.push({
        label: messages.groupByColumn,
        onSelect: () => actions.setRowGroup(column.id, true),
      });
    }
  }

  if (items.length === 0) return null;
  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      label={column.header}
      items={items}
      alignEnd
    />
  );
}

function moveLabel(messages: Messages, edge: 'start' | 'end', rtl: boolean) {
  const left = (edge === 'start') !== rtl;
  return left ? messages.moveLeft : messages.moveRight;
}

export function hasColumnMenu(column: EffectiveColumn, ctx: ReturnType<typeof useGrid>) {
  const a = ctx.columnActions;
  return (
    column.sortable ||
    a.canPin ||
    (a.canReorder && column.reorderable) ||
    (a.canHide && column.hideable) ||
    (a.canGroup && column.groupable)
  );
}
