import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { EffectiveColumn } from '../core/columnState';
import { getColumnValue } from '../core/columns';
import { applyRowDrafts, canEditColumn, editorModel } from '../core/editValue';
import { formatCell, type FormatOptions } from '../core/format';
import { useGrid } from '../state/GridContext';
import { Menu } from '../toolbar/Popover';
import type { RowId } from '../types';
import { Dialog } from './Dialog';
import { isSafeImageSrc } from './cellContent';

export type RowDialogKind = 'view' | 'edit' | 'delete';

export interface RowDialogState {
  kind: RowDialogKind;
  rowId: RowId;
}

export interface RowMenuState {
  rowId: RowId;
  x: number;
  y: number;
}

function rowAt<TRow>(rows: readonly TRow[], ids: readonly RowId[], rowId: RowId): TRow | undefined {
  const index = ids.indexOf(rowId);
  return index < 0 ? undefined : rows[index];
}

export function RowActions({
  menu,
  anchorRef,
  dialog,
  onCloseMenu,
  onOpenDialog,
  onCloseDialog,
}: {
  menu: RowMenuState | null;
  anchorRef: RefObject<HTMLElement | null>;
  dialog: RowDialogState | null;
  onCloseMenu(): void;
  onOpenDialog(kind: RowDialogKind, rowId: RowId): void;
  onCloseDialog(): void;
}) {
  const ctx = useGrid();
  const { messages } = ctx;
  const dialogRow = dialog ? rowAt(ctx.rows, ctx.rowIds, dialog.rowId) : undefined;

  return (
    <>
      {menu && (
        <Menu
          open
          onClose={onCloseMenu}
          anchorRef={anchorRef}
          label={messages.rowMenu}
          point={{ x: menu.x, y: menu.y }}
          excludeAnchor={false}
          keepOnRightClick
          items={[
            { label: messages.viewRow, onSelect: () => onOpenDialog('view', menu.rowId) },
            { label: messages.editRow, onSelect: () => onOpenDialog('edit', menu.rowId) },
            { label: messages.deleteRow, onSelect: () => onOpenDialog('delete', menu.rowId) },
          ]}
        />
      )}
      {dialog && dialogRow !== undefined && (
        <RowDialog
          key={dialog.kind + dialog.rowId}
          kind={dialog.kind}
          row={dialogRow}
          rowId={dialog.rowId}
          onClose={onCloseDialog}
        />
      )}
    </>
  );
}

function RowDialog({
  kind,
  row,
  rowId,
  onClose,
}: {
  kind: RowDialogKind;
  row: unknown;
  rowId: RowId;
  onClose(): void;
}) {
  switch (kind) {
    case 'view':
      return <ViewDialog row={row} onClose={onClose} />;
    case 'edit':
      return <EditDialog row={row} rowId={rowId} onClose={onClose} />;
    case 'delete':
      return <DeleteDialog row={row} rowId={rowId} onClose={onClose} />;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function ViewDialog({ row, onClose }: { row: unknown; onClose(): void }) {
  const ctx = useGrid();
  const { messages } = ctx;
  return (
    <Dialog title={messages.rowDetails} closeLabel={messages.close} onClose={onClose}>
      <dl className="aits-details">
        {ctx.visibleColumns.map((column) => {
          const value = getColumnValue(row, column);
          const formatted = formatCell(row, column, ctx.formatOptions);
          return (
            <div className="aits-detail-row" key={column.id}>
              <dt>{column.header}</dt>
              <dd>
                {column.type === 'image' && isSafeImageSrc(value) ? (
                  <img className="aits-detail-image" alt="" src={value} />
                ) : (
                  formatted
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="aits-dialog-actions">
        <button type="button" className="aits-button" onClick={onClose}>
          {messages.close}
        </button>
      </div>
    </Dialog>
  );
}

function editableColumns(columns: readonly EffectiveColumn[]): EffectiveColumn[] {
  // Image columns have no form control. View still shows them, and the value stays on the row.
  return columns.filter((column) => canEditColumn(column) && column.type !== 'image');
}

function buildDrafts(
  row: unknown,
  columns: readonly EffectiveColumn[],
  formatOptions: FormatOptions,
): Record<string, string | boolean> {
  const drafts: Record<string, string | boolean> = {};
  for (const column of columns) {
    const value = getColumnValue(row, column);
    const formatted = formatCell(row, column, formatOptions);
    const model = editorModel(column, value, formatted);
    drafts[column.id] = model.kind === 'boolean' ? model.checked : model.text;
  }
  return drafts;
}

function EditDialog({ row, rowId, onClose }: { row: unknown; rowId: RowId; onClose(): void }) {
  const ctx = useGrid();
  const { messages } = ctx;
  const columns = editableColumns(ctx.visibleColumns);
  const formId = useId();
  const [drafts, setDrafts] = useState(() => buildDrafts(row, columns, ctx.formatOptions));
  const initial = useRef(drafts);
  const [errors, setErrors] = useState<Record<string, true>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = applyRowDrafts(row, columns, drafts, initial.current);
    if (!result.ok) {
      setErrors(result.errors);
      const firstId = Object.keys(result.errors)[0];
      if (firstId) document.getElementById(`${formId}-${firstId}`)?.focus();
      return;
    }
    ctx.props.onRowEdit?.({ row, rowId, nextRow: result.nextRow });
    onClose();
  };

  return (
    <Dialog title={messages.editRecord} closeLabel={messages.close} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {columns.map((column) => {
          const id = `${formId}-${column.id}`;
          const errorId = `${id}-error`;
          const invalid = errors[column.id] === true;
          const draft = drafts[column.id];
          return (
            <div className="aits-field" key={column.id}>
              <label className="aits-field-label" htmlFor={id}>
                {column.header}
              </label>
              <FieldControl
                id={id}
                column={column}
                draft={draft ?? ''}
                invalid={invalid}
                describedBy={invalid ? errorId : undefined}
                onDraft={(value) => {
                  setDrafts((current) => ({ ...current, [column.id]: value }));
                  if (invalid) {
                    setErrors((current) => {
                      const next = { ...current };
                      delete next[column.id];
                      return next;
                    });
                  }
                }}
              />
              {invalid && (
                <p id={errorId} className="aits-field-error" role="alert">
                  {messages.invalidValue}
                </p>
              )}
            </div>
          );
        })}
        <div className="aits-dialog-actions">
          <button type="button" className="aits-button" onClick={onClose}>
            {messages.cancel}
          </button>
          <button type="submit" className="aits-button aits-button-primary">
            {messages.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function FieldControl({
  id,
  column,
  draft,
  invalid,
  describedBy,
  onDraft,
}: {
  id: string;
  column: EffectiveColumn;
  draft: string | boolean;
  invalid: boolean;
  describedBy?: string;
  onDraft(value: string | boolean): void;
}) {
  const model = editorModel(column, draft);
  switch (model.kind) {
    case 'boolean':
      return (
        <input
          id={id}
          type="checkbox"
          className="aits-checkbox"
          checked={draft === true}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onDraft(event.target.checked)}
        />
      );
    case 'enum': {
      const text = typeof draft === 'string' ? draft : String(draft);
      const options = model.options.some((option) => String(option) === text)
        ? model.options
        : [text, ...model.options];
      return (
        <select
          id={id}
          className="aits-input"
          value={text}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onDraft(event.target.value)}
        >
          {options.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      );
    }
    case 'text':
    case 'number':
    case 'date':
      return (
        <input
          id={id}
          type={model.kind === 'date' ? 'date' : 'text'}
          inputMode={model.kind === 'number' ? 'decimal' : undefined}
          className="aits-input"
          value={typeof draft === 'string' ? draft : ''}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onDraft(event.target.value)}
        />
      );
    default: {
      const unreachable: never = model.kind;
      return unreachable;
    }
  }
}

function DeleteDialog({ row, rowId, onClose }: { row: unknown; rowId: RowId; onClose(): void }) {
  const ctx = useGrid();
  const { messages } = ctx;
  const confirm = () => {
    ctx.props.onRowDelete?.(row, rowId);
    onClose();
  };
  return (
    <Dialog title={messages.confirmDelete} closeLabel={messages.close} onClose={onClose}>
      <p className="aits-confirm-message">{messages.confirmDeleteMessage}</p>
      <div className="aits-dialog-actions">
        <button type="button" className="aits-button" onClick={onClose}>
          {messages.no}
        </button>
        <button type="button" className="aits-button aits-button-danger" onClick={confirm}>
          {messages.yes}
        </button>
      </div>
    </Dialog>
  );
}
