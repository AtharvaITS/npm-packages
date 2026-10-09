import type { CSSProperties } from 'react';
import type { GroupDisplayItem } from '../core/group';
import { formatGroupValue } from '../core/group';
import { useGrid } from '../state/GridContext';
import { GroupChevronIcon } from './icons';

export function useGroupLabel(item: GroupDisplayItem): string {
  const ctx = useGrid();
  const column = ctx.columns.find((candidate) => candidate.id === item.columnId);
  if (!column) return ctx.messages.blankGroup;
  const sample = item.sampleIndex >= 0 ? ctx.rows[item.sampleIndex] : undefined;
  return formatGroupValue(item.value, column, sample, ctx.formatOptions, ctx.messages.blankGroup);
}

/** Chevron, group value, and leaf count. Shared by table, card, and list rows. */
export function GroupSummary({
  item,
  indent = true,
}: {
  item: GroupDisplayItem;
  indent?: boolean;
}) {
  const ctx = useGrid();
  const label = useGroupLabel(item);
  const style: CSSProperties | undefined = indent
    ? { paddingInlineStart: item.depth * 16 }
    : undefined;
  return (
    <span className="aits-group-summary" style={style}>
      <span
        className="aits-group-chevron"
        data-expanded={item.expanded || undefined}
        data-rtl={ctx.rtl || undefined}
        aria-hidden
      >
        <GroupChevronIcon />
      </span>
      <span className="aits-group-label" title={label}>
        {label}
      </span>
      <span className="aits-group-count">{ctx.messages.groupCount(item.count)}</span>
    </span>
  );
}
