import { memo, type MouseEvent } from 'react';
import { POS_COL, POS_ROW } from '../../a11y/useRovingFocus';
import type { EffectiveColumn } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import {
  buildCardContext,
  getCellParts,
  isInteractiveTarget,
  isSafeImageSrc,
} from '../cellContent';

export interface ListItemProps {
  rowIndex: number;
  fieldColumns: EffectiveColumn[];
  focusRow: number;
  tabbable: boolean;
  position: number;
  setSize: number;
}

/**
 * One record as a list item: primary line (title), secondary line (subtitle)
 * and remaining fields (FR-014). With selection on, items are listbox options,
 * so the check mark is decorative (state is exposed via aria-selected).
 */
export const ListItem = memo(function ListItem({
  rowIndex,
  fieldColumns,
  focusRow,
  tabbable,
  position,
  setSize,
}: ListItemProps) {
  const itemProps = { [POS_ROW]: focusRow, [POS_COL]: 0, tabIndex: tabbable ? 0 : -1 };
  const ctx = useGrid();
  const { selection, titleColumn, subtitleColumn, imageColumn } = ctx;
  const id = ctx.rowIds[rowIndex]!;
  const hasSelect = selection.mode !== 'none';
  const selected = selection.selected.has(id);
  const selectable = selection.isSelectable(rowIndex);

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target, event.currentTarget)) return;
    if (hasSelect && event.shiftKey && selection.mode === 'multi') {
      selection.toggleRow(rowIndex, { range: true });
      return;
    }
    if (hasSelect && (event.ctrlKey || event.metaKey)) {
      selection.toggleRow(rowIndex);
      return;
    }
    ctx.activateRow(rowIndex, event);
  };

  let body;
  if (ctx.props.renderListItem) {
    body = ctx.props.renderListItem(buildCardContext(ctx, rowIndex, fieldColumns, 'list'));
  } else {
    const image = imageColumn ? getCellParts(ctx, rowIndex, imageColumn, 'list') : undefined;
    const title = titleColumn ? getCellParts(ctx, rowIndex, titleColumn, 'list') : undefined;
    const subtitle = subtitleColumn
      ? getCellParts(ctx, rowIndex, subtitleColumn, 'list')
      : undefined;
    body = (
      <>
        {image &&
          (image.custom ? (
            <span className="aits-list-media">{image.content}</span>
          ) : isSafeImageSrc(image.value) ? (
            <img
              className="aits-list-media"
              src={image.value}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="aits-list-media aits-list-media-empty" aria-hidden="true" />
          ))}
        <div className="aits-list-text">
          <div
            className="aits-list-primary"
            title={title && !title.custom ? title.formatted : undefined}
          >
            {title?.content}
          </div>
          {subtitle && (
            <div
              className="aits-list-secondary"
              title={subtitle.custom ? undefined : subtitle.formatted}
            >
              {subtitle.content}
            </div>
          )}
          {fieldColumns.length > 0 && (
            <div className="aits-list-meta">
              {fieldColumns.map((column) => {
                const parts = getCellParts(ctx, rowIndex, column, 'list');
                return (
                  <span className="aits-list-meta-item" key={column.id}>
                    <span className="aits-list-meta-label">{column.header}: </span>
                    {parts.content}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      role={hasSelect ? 'option' : 'listitem'}
      className="aits-list-item"
      aria-selected={hasSelect ? selected : undefined}
      aria-disabled={hasSelect && !selectable ? true : undefined}
      aria-posinset={position}
      aria-setsize={setSize}
      data-selected={selected || undefined}
      data-row-id={id}
      onClick={onClick}
      {...itemProps}
    >
      {hasSelect && (
        <span
          className="aits-list-check"
          aria-hidden="true"
          data-checked={selected || undefined}
          data-disabled={!selectable || undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (selectable) selection.toggleRow(rowIndex, { range: e.shiftKey });
          }}
        >
          {selected ? '✓' : ''}
        </span>
      )}
      {body}
    </div>
  );
});
