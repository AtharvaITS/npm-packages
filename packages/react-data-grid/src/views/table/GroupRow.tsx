import type { CSSProperties, MouseEvent } from 'react';
import { POS_COL, POS_ROW } from '../../a11y/useRovingFocus';
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
}: {
  item: GroupDisplayItem;
  focusRow: number;
  ariaRowIndex: number;
  hasSelect: boolean;
  selectStyle?: CSSProperties;
  activeCol: number;
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
  return (
    <div
      role="row"
      className="aits-row"
      aria-rowindex={ariaRowIndex}
      aria-expanded={item.expanded}
      data-group="true"
      data-group-key={item.key}
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
      <div
        role="gridcell"
        className="aits-cell aits-group-cell"
        aria-colindex={hasSelect ? 2 : 1}
        {...itemProps(hasSelect ? 1 : 0)}
      >
        <GroupSummary item={item} />
      </div>
    </div>
  );
}
