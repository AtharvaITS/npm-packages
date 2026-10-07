import { useState, type RefObject } from 'react';
import { useGrid } from '../state/GridContext';
import { Popover } from '../toolbar/Popover';
import type { TextAlignment } from '../types';
import {
  TEXT_ALIGN_VALUES,
  draftToTextAlignment,
  textAlignmentToDraft,
  type TextAlignmentDraft,
} from './textAlignment';

export function TextAlignmentEditor({
  anchorRef,
  initial,
  onCancel,
  onApply,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  initial: TextAlignment;
  onCancel(): void;
  onApply(alignment: TextAlignment): void;
}) {
  const { messages } = useGrid();
  const [draft, setDraft] = useState<TextAlignmentDraft>(() => textAlignmentToDraft(initial));

  return (
    <Popover
      open
      onClose={onCancel}
      anchorRef={anchorRef}
      label={messages.textAlignment}
      className="aits-format-editor"
      centered
    >
      <div className="aits-popover-title">{messages.textAlignment}</div>
      <fieldset className="aits-export-fieldset">
        <legend className="aits-export-legend">{messages.textAlignment}</legend>
        {TEXT_ALIGN_VALUES.map((value) => (
          <label key={value} className="aits-enum-option">
            <input
              type="checkbox"
              checked={draft.alignment === value}
              onChange={() => setDraft({ alignment: value })}
            />
            <span>{messages.textAlignments[value]}</span>
          </label>
        ))}
      </fieldset>
      <div className="aits-popover-actions aits-format-actions-end">
        <button type="button" className="aits-button" onClick={onCancel}>
          {messages.formatCancel}
        </button>
        <button
          type="button"
          className="aits-button"
          data-active
          onClick={() => onApply(draftToTextAlignment(draft))}
        >
          {messages.textAlignmentApply}
        </button>
      </div>
    </Popover>
  );
}
