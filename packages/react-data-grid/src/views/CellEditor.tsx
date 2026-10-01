import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import type { EffectiveColumn } from '../core/columnState';
import { editorModel, type EditorKind } from '../core/editValue';
import { useGrid } from '../state/GridContext';

export function isCellEditing(
  editing: { rowId: string; columnId: string } | null,
  rowId: string | undefined,
  columnId: string,
): boolean {
  return editing !== null && editing.rowId === rowId && editing.columnId === columnId;
}

export function openCellEditor(
  event: { stopPropagation(): void },
  startEdit: (rowIndex: number, columnId: string) => void,
  rowIndex: number,
  columnId: string,
) {
  event.stopPropagation();
  startEdit(rowIndex, columnId);
}

export function CellEditor({
  column,
  value,
  formatted = '',
}: {
  column: EffectiveColumn;
  value: unknown;
  formatted?: string;
}) {
  const { commitEdit, cancelEdit } = useGrid();
  const model = editorModel(column, value, formatted);
  const [text, setText] = useState(model.text);
  const [checked, setChecked] = useState(model.checked);
  const draft = useRef<string | boolean>(model.kind === 'boolean' ? model.checked : model.text);
  const closed = useRef(false);
  const ignoreBlur = useRef(false);
  const fieldRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    ignoreBlur.current = false;
    const el = fieldRef.current;
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === 'text') el.select();
    }
    return () => {
      ignoreBlur.current = true;
    };
  }, []);

  const close = (save: boolean) => {
    if (closed.current) return;
    closed.current = true;
    if (save) commitEdit(draft.current);
    else cancelEdit();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(false);
    }
  };

  const stopMouse = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return renderEditor(model.kind, {
    column,
    text,
    checked,
    options: model.options,
    fieldRef,
    onKeyDown,
    stopMouse,
    onBlur: () => {
      if (ignoreBlur.current) return;
      close(false);
    },
    onText: (next) => {
      draft.current = next;
      setText(next);
    },
    onChecked: (next) => {
      draft.current = next;
      setChecked(next);
    },
  });
}

interface EditorControls {
  column: EffectiveColumn;
  text: string;
  checked: boolean;
  options: readonly unknown[];
  fieldRef: RefObject<HTMLInputElement | HTMLSelectElement | null>;
  onKeyDown: (event: KeyboardEvent) => void;
  stopMouse: (event: MouseEvent) => void;
  onBlur: () => void;
  onText: (value: string) => void;
  onChecked: (value: boolean) => void;
}

function renderEditor(kind: EditorKind, controls: EditorControls) {
  const {
    column,
    text,
    checked,
    options,
    fieldRef,
    onKeyDown,
    stopMouse,
    onBlur,
    onText,
    onChecked,
  } = controls;
  switch (kind) {
    case 'boolean':
      return (
        <input
          ref={fieldRef as RefObject<HTMLInputElement>}
          type="checkbox"
          className="aits-checkbox"
          checked={checked}
          aria-label={column.header}
          onChange={(event) => onChecked(event.target.checked)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onClick={stopMouse}
          onDoubleClick={stopMouse}
          onMouseDown={stopMouse}
        />
      );
    case 'enum': {
      const values = options.some((option) => String(option) === text)
        ? options
        : [text, ...options];
      return (
        <select
          ref={fieldRef as RefObject<HTMLSelectElement>}
          className="aits-input aits-cell-editor"
          value={text}
          aria-label={column.header}
          onChange={(event) => onText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onClick={stopMouse}
          onDoubleClick={stopMouse}
          onMouseDown={stopMouse}
        >
          {values.map((option) => (
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
          ref={fieldRef as RefObject<HTMLInputElement>}
          type={kind === 'date' ? 'date' : 'text'}
          inputMode={kind === 'number' ? 'decimal' : undefined}
          className="aits-input aits-cell-editor"
          value={text}
          aria-label={column.header}
          onChange={(event) => onText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onClick={stopMouse}
          onDoubleClick={stopMouse}
          onMouseDown={stopMouse}
        />
      );
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
