import type { CSSProperties } from 'react';
import { formatAggregateValue } from '../core/aggregate';
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

/** Column totals for card and list group banners, where columns are not aligned. */
export function GroupAggregateValues({ item }: { item: GroupDisplayItem }) {
  const ctx = useGrid();
  if (!item.aggregates) return null;
  const parts = ctx.visibleColumns.flatMap((column) => {
    if (column.aggregate !== 'sum') return [];
    const sum = item.aggregates?.[column.id];
    if (sum === undefined) return [];
    return [
      {
        id: column.id,
        header: column.header,
        text: formatAggregateValue(sum, column, ctx.formatOptions),
      },
    ];
  });
  if (parts.length === 0) return null;
  return (
    <span className="aits-group-aggs">
      {parts.map((part) => (
        <span key={part.id} className="aits-group-agg" data-aggregate={part.id}>
          <span className="aits-group-agg-label">{part.header}</span>{' '}
          <span className="aits-group-agg-value">{part.text}</span>
        </span>
      ))}
    </span>
  );
}
