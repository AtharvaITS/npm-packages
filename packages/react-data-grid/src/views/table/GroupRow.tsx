import type { CSSProperties, MouseEvent } from 'react';
import { POS_COL, POS_ROW } from '../../a11y/useRovingFocus';
import { formatAggregateValue } from '../../core/aggregate';
import type { EffectiveColumn } from '../../core/columnState';
import type { GroupDisplayItem } from '../../core/group';
import { useGrid } from '../../state/GridContext';
import { isInteractiveTarget } from '../cellContent';
import { GroupSummary } from '../GroupSummary';

export function GroupRow({
  item,
  focusRow,
  ariaRowIndex,
  hasSelect,
  selectStyle,
  activeCol,
  columns,
  cellStyles,
}: {
  item: GroupDisplayItem;
  focusRow: number;
  ariaRowIndex: number;
  hasSelect: boolean;
  selectStyle?: CSSProperties;
  activeCol: number;
  columns: readonly EffectiveColumn[];
  cellStyles: readonly (CSSProperties | undefined)[];
}) {
  const ctx = useGrid();
  const itemProps = (col: number) => ({
    [POS_ROW]: focusRow,
    [POS_COL]: col,
    tabIndex: col === activeCol ? 0 : -1,
  });
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target, event.currentTarget)) return;
    ctx.toggleGroup(item.key);
  };
  const offset = hasSelect ? 1 : 0;
  const aggregated = columns.some((column) => column.aggregate === 'sum');
  return (
    <div
      role="row"
      className="aits-row"
      aria-rowindex={ariaRowIndex}
      aria-expanded={item.expanded}
      data-group="true"
      data-group-key={item.key}
      data-aggregated={aggregated || undefined}
      onClick={onClick}
    >
      {hasSelect && (
        <div
          role="gridcell"
          className="aits-cell aits-select-cell"
          aria-colindex={1}
          data-pinned="start"
          style={selectStyle}
          {...itemProps(0)}
        />
      )}
      {aggregated ? (
        columns.map((column, i) => {
          const sum = column.aggregate === 'sum' ? item.aggregates?.[column.id] : undefined;
          const text =
            sum !== undefined ? formatAggregateValue(sum, column, ctx.formatOptions) : undefined;
          const isLabel = i === 0;
          return (
            <div
              key={column.id}
              role="gridcell"
              className={isLabel ? 'aits-cell aits-group-cell' : 'aits-cell'}
              aria-colindex={i + 1 + offset}
              data-align={!isLabel && text !== undefined ? column.align : undefined}
              data-type={text !== undefined ? column.type : undefined}
              data-pinned={column.pinned ?? undefined}
              data-aggregate={text !== undefined ? column.id : undefined}
              title={text || undefined}
              style={cellStyles[i]}
              {...itemProps(i + offset)}
            >
              {isLabel ? <GroupSummary item={item} /> : null}
              {text !== undefined ? <span className="aits-group-agg-value">{text}</span> : null}
            </div>
          );
        })
      ) : (
        <div
          role="gridcell"
          className="aits-cell aits-group-cell"
          aria-colindex={offset + 1}
          {...itemProps(offset)}
        >
          <GroupSummary item={item} />
        </div>
      )}
    </div>
  );
}
