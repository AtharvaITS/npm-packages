import { useRef, useState } from 'react';
import { useGrid } from '../state/GridContext';
import { ColumnsIcon } from '../views/icons';
import { Popover } from './Popover';

/** Toolbar "Columns" chooser: show/hide columns in every view (FR-037, FR-038). */
export function ColumnsButton() {
  const ctx = useGrid();
  const { messages, columnActions } = ctx;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const hideable = ctx.columns.filter((c) => c.hideable);
  if (!columnActions.canHide || hideable.length === 0) return null;
  const visibleCount = ctx.visibleColumns.length;

  return (
    <>
      <button
        ref={button}
        type="button"
        className="aits-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ColumnsIcon />
        <span>{messages.columns}</span>
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={button}
        label={messages.columns}
        className="aits-columns-panel"
        alignEnd
      >
        <div className="aits-popover-title">{messages.columns}</div>
        <div className="aits-columns-list">
          {hideable.map((c) => {
            const lastVisible = !c.hidden && visibleCount <= 1;
            return (
              <label key={c.id} className="aits-enum-option">
                <input
                  type="checkbox"
                  checked={!c.hidden}
                  disabled={lastVisible}
                  onChange={(e) => columnActions.setHidden(c.id, !e.target.checked)}
                />
                <span>{c.header}</span>
              </label>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
