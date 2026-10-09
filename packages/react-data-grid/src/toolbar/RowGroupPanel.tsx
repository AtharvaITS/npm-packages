import { useRef, useState, type DragEvent } from 'react';
import { useGrid } from '../state/GridContext';
import { CloseIcon, GroupDragIcon } from '../views/icons';
import { COLUMN_DRAG_MIME } from '../views/table/useColumnReorder';

function dragId(event: DragEvent): string {
  return event.dataTransfer.getData(COLUMN_DRAG_MIME) || event.dataTransfer.getData('text/plain');
}

function isColumnDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (type === COLUMN_DRAG_MIME || type === 'text/plain') return true;
  }
  return false;
}

/** AG Grid-style drop zone: drag a column here to group, drag chips to reorder. */
export function RowGroupPanel() {
  const ctx = useGrid();
  const { columnActions, messages } = ctx;
  const [over, setOver] = useState<string | null>(null);
  const dropped = useRef(false);
  if (!columnActions.canGroup) return null;

  const groups = ctx.columns
    .filter((column) => column.rowGroup)
    .slice()
    .sort((a, b) => (a.rowGroupIndex ?? 0) - (b.rowGroupIndex ?? 0));

  const accept = (id: string) => ctx.columns.some((column) => column.id === id && column.groupable);

  const onPanelDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isColumnDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver((current) => current ?? 'panel');
  };

  const onPanelDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dropped.current = true;
    const id = dragId(event);
    setOver(null);
    if (accept(id)) columnActions.placeRowGroup(id, null);
  };

  return (
    <div
      className="aits-group-panel"
      role="region"
      aria-label={messages.rowGroupPanelLabel}
      data-drop={over === 'panel' || undefined}
      onDragOver={onPanelDragOver}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOver(null);
      }}
      onDrop={onPanelDrop}
    >
      {groups.map((column) => (
        <div
          key={column.id}
          className="aits-chip aits-group-chip"
          draggable
          data-drop-target={over === column.id || undefined}
          onDragStart={(event) => {
            if ((event.target as HTMLElement).closest('button')) {
              event.preventDefault();
              return;
            }
            dropped.current = false;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData(COLUMN_DRAG_MIME, column.id);
            event.dataTransfer.setData('text/plain', column.id);
            event.stopPropagation();
          }}
          onDragOver={(event) => {
            if (!isColumnDrag(event)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setOver(column.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            dropped.current = true;
            const id = dragId(event);
            setOver(null);
            if (accept(id)) columnActions.placeRowGroup(id, column.id);
          }}
          onDragEnd={() => {
            if (!dropped.current) columnActions.setRowGroup(column.id, false);
            dropped.current = false;
            setOver(null);
          }}
        >
          <span className="aits-group-chip-grip" aria-hidden>
            <GroupDragIcon />
          </span>
          <span className="aits-chip-label">{column.header}</span>
          <button
            type="button"
            className="aits-icon-button"
            aria-label={messages.removeRowGroup(column.header)}
            onClick={() => columnActions.setRowGroup(column.id, false)}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      <span className="aits-group-panel-hint">{messages.rowGroupDropHint}</span>
    </div>
  );
}
