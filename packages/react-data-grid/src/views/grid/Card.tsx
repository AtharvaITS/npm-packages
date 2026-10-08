import { memo, type MouseEvent } from 'react';
import { POS_COL, POS_ROW } from '../../a11y/useRovingFocus';
import type { EffectiveColumn } from '../../core/columnState';
import { useGrid } from '../../state/GridContext';
import { CellEditor, openCellEditor } from '../CellEditor';
import {
  buildCardContext,
  getCellParts,
  isInteractiveTarget,
  isSafeImageSrc,
} from '../cellContent';
import { handleRowContextMenu } from '../rowContextMenu';
import { SelectCheckbox } from '../SelectCheckbox';

export interface CardProps {
  rowIndex: number;
  fieldColumns: EffectiveColumn[];
  focusRow: number;
  focusCol: number;
  tabbable: boolean;
  ariaColIndex: number;
}

/** One record as a card (US2): optional image, title, and labelled fields. Memoized for scrolling. */
export const Card = memo(function Card({
  rowIndex,
  fieldColumns,
  focusRow,
  focusCol,
  tabbable,
  ariaColIndex,
}: CardProps) {
  const itemProps = { [POS_ROW]: focusRow, [POS_COL]: focusCol, tabIndex: tabbable ? 0 : -1 };
  const ctx = useGrid();
  const { selection, titleColumn, imageColumn } = ctx;
  const id = ctx.rowIds[rowIndex]!;
  const editingColumnId = ctx.editing?.rowId === id ? ctx.editing.columnId : null;
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
  if (ctx.props.renderCard) {
    body = ctx.props.renderCard(buildCardContext(ctx, rowIndex, fieldColumns, 'grid'));
  } else {
    const image = imageColumn ? getCellParts(ctx, rowIndex, imageColumn, 'grid') : undefined;
    const title = titleColumn ? getCellParts(ctx, rowIndex, titleColumn, 'grid') : undefined;
    const imageEditing = imageColumn !== undefined && editingColumnId === imageColumn.id;
    const titleEditing = titleColumn !== undefined && editingColumnId === titleColumn.id;
    body = (
      <>
        {image &&
          (imageEditing && imageColumn ? (
            <div
              className="aits-card-media"
              onDoubleClick={(event) =>
                openCellEditor(event, ctx.startEdit, rowIndex, imageColumn.id)
              }
            >
              <CellEditor column={imageColumn} value={image.value} formatted={image.formatted} />
            </div>
          ) : image.custom ? (
            <div className="aits-card-media">{image.content}</div>
          ) : isSafeImageSrc(image.value) ? (
            <div
              className="aits-card-media"
              onDoubleClick={(event) =>
                imageColumn && openCellEditor(event, ctx.startEdit, rowIndex, imageColumn.id)
              }
            >
              <img src={image.value} alt="" loading="lazy" decoding="async" />
            </div>
          ) : (
            <div
              className="aits-card-media aits-card-media-empty"
              aria-hidden="true"
              onDoubleClick={(event) =>
                imageColumn && openCellEditor(event, ctx.startEdit, rowIndex, imageColumn.id)
              }
            />
          ))}
        <div className="aits-card-body">
          {title && (
            <div
              className="aits-card-title"
              title={titleEditing || title.custom ? undefined : title.formatted}
              onDoubleClick={(event) =>
                titleColumn && openCellEditor(event, ctx.startEdit, rowIndex, titleColumn.id)
              }
            >
              {titleEditing && titleColumn ? (
                <CellEditor column={titleColumn} value={title.value} formatted={title.formatted} />
              ) : (
                title.content
              )}
            </div>
          )}
          {fieldColumns.length > 0 && (
            <dl className="aits-card-fields">
              {fieldColumns.map((column) => {
                const parts = getCellParts(ctx, rowIndex, column, 'grid');
                const fieldEditing = editingColumnId === column.id;
                return (
                  <div className="aits-card-field" key={column.id} data-type={column.type}>
                    <dt>{column.header}</dt>
                    <dd
                      title={
                        fieldEditing || parts.custom ? undefined : parts.formatted || undefined
                      }
                      onDoubleClick={(event) =>
                        openCellEditor(event, ctx.startEdit, rowIndex, column.id)
                      }
                    >
                      {fieldEditing ? (
                        <CellEditor
                          column={column}
                          value={parts.value}
                          formatted={parts.formatted}
                        />
                      ) : (
                        parts.content
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      role="gridcell"
      className="aits-card"
      aria-colindex={ariaColIndex}
      aria-selected={hasSelect ? selected : undefined}
      aria-disabled={hasSelect && !selectable ? true : undefined}
      data-selected={selected || undefined}
      data-row-id={id}
      onClick={onClick}
      onContextMenu={(event) =>
        handleRowContextMenu(event, ctx.enableRowContextMenu, rowIndex, ctx.openRowMenu)
      }
      {...itemProps}
    >
      {hasSelect && (
        <div className="aits-card-select">
          <SelectCheckbox
            checked={selected}
            disabled={!selectable}
            label={selected ? ctx.messages.deselectRow : ctx.messages.selectRow}
            onToggle={(e) => selection.toggleRow(rowIndex, { range: e.shiftKey })}
          />
        </div>
      )}
      {body}
    </div>
  );
});
