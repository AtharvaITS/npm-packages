import { useState, type RefObject } from 'react';
import { useGrid } from '../state/GridContext';
import { Popover } from '../toolbar/Popover';
import type { HeaderStyle } from '../types';
import {
  HEADER_FONT_WEIGHTS,
  HEADER_TEXT_TRANSFORMS,
  draftToHeaderStyle,
  headerStyleToDraft,
  isHeaderFontWeight,
  isHeaderTextTransform,
  type HeaderStyleDraft,
  type HeaderStyleError,
} from './headerStyle';
import { ColorField } from './RuleEditor';

const DEFAULT_BACKGROUND = '#fff3bf';
const DEFAULT_TEXT = '#1a1a1a';

export function HeaderStyleEditor({
  anchorRef,
  initial,
  onCancel,
  onApply,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  initial: HeaderStyle;
  onCancel(): void;
  onApply(style: HeaderStyle): void;
}) {
  const { messages } = useGrid();
  const [draft, setDraft] = useState<HeaderStyleDraft>(() => headerStyleToDraft(initial));
  const [error, setError] = useState<HeaderStyleError | null>(null);

  const patch = (next: Partial<HeaderStyleDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setError(null);
  };

  const apply = () => {
    const result = draftToHeaderStyle(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onApply(result.style);
  };

  const errorText = (code: HeaderStyleError) => {
    switch (code) {
      case 'fontSize':
        return messages.formatValidationNumber;
      default: {
        const exhaustive: never = code;
        void exhaustive;
        return messages.formatValidationNumber;
      }
    }
  };

  return (
    <Popover
      open
      onClose={onCancel}
      anchorRef={anchorRef}
      label={messages.headerStyle}
      className="aits-format-editor"
      centered
    >
      <div className="aits-popover-title">{messages.headerStyle}</div>
      <fieldset className="aits-export-fieldset">
        <ColorField
          label={messages.headerStyleBackground}
          applyLabel={messages.formatUseColor}
          value={draft.backgroundColor}
          fallback={DEFAULT_BACKGROUND}
          showValue
          freeSelect
          onChange={(backgroundColor) => patch({ backgroundColor })}
        />
        <ColorField
          label={messages.headerStyleText}
          applyLabel={messages.formatUseColor}
          value={draft.textColor}
          fallback={DEFAULT_TEXT}
          showValue
          freeSelect
          onChange={(textColor) => patch({ textColor })}
        />
        <label className="aits-format-field">
          <span>{messages.headerStyleFontSize}</span>
          <span className="aits-format-size">
            <input
              className="aits-input"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              aria-label={messages.headerStyleFontSize}
              value={draft.fontSize}
              onChange={(event) => patch({ fontSize: event.target.value })}
            />
            <span>{messages.headerStyleFontSizeUnit}</span>
          </span>
        </label>
        <label className="aits-format-field">
          <span>{messages.headerStyleFontWeight}</span>
          <select
            className="aits-input"
            aria-label={messages.headerStyleFontWeight}
            value={draft.fontWeight}
            onChange={(event) => {
              const value = event.target.value;
              if (isHeaderFontWeight(value)) patch({ fontWeight: value });
            }}
          >
            {HEADER_FONT_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {messages.headerStyleFontWeights[weight]}
              </option>
            ))}
          </select>
        </label>
        <label className="aits-format-field">
          <span>{messages.headerStyleTextTransform}</span>
          <select
            className="aits-input"
            aria-label={messages.headerStyleTextTransform}
            value={draft.textTransform}
            onChange={(event) => {
              const value = event.target.value;
              if (isHeaderTextTransform(value)) patch({ textTransform: value });
            }}
          >
            {HEADER_TEXT_TRANSFORMS.map((transform) => (
              <option key={transform} value={transform}>
                {messages.headerStyleTransforms[transform]}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {error && (
        <p className="aits-export-notice" role="alert">
          {errorText(error)}
        </p>
      )}
      <div className="aits-popover-actions aits-format-actions-end">
        <button type="button" className="aits-button" onClick={onCancel}>
          {messages.formatCancel}
        </button>
        <button type="button" className="aits-button" data-active onClick={apply}>
          {messages.headerStyleApply}
        </button>
      </div>
    </Popover>
  );
}
