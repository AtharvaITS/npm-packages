import { useId, useState, type RefObject } from 'react';
import { useGrid } from '../state/GridContext';
import { Popover } from '../toolbar/Popover';
import type {
  ConditionalFormatRule,
  FormatFontStyle,
  FormatFontWeight,
  FormatOperator,
} from '../types';
import {
  FORMAT_OPERATORS,
  createRuleId,
  draftToRule,
  emptyDraft,
  isFormatOperator,
  isNumericOperator,
  operatorValueCount,
  ruleToDraft,
  type FormatRuleDraft,
  type FormatRuleError,
} from './evaluate';

const FONT_WEIGHTS: FormatFontWeight[] = ['default', 'normal', '600', '700'];
const FONT_STYLES: FormatFontStyle[] = ['default', 'normal', 'italic'];
const DEFAULT_BACKGROUND = '#fff3bf';
const DEFAULT_TEXT = '#1a1a1a';

function valueKind(
  operator: FormatOperator | '',
  columnType: string | undefined,
): 'none' | 'text' | 'date' {
  if (!isFormatOperator(operator) || operatorValueCount(operator) === 0) return 'none';
  if (isNumericOperator(operator) && columnType === 'date') return 'date';
  return 'text';
}

export function RuleEditor({
  anchorRef,
  initial,
  onCancel,
  onSave,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  initial: ConditionalFormatRule | null;
  onCancel(): void;
  onSave(rule: ConditionalFormatRule): void;
}) {
  const ctx = useGrid();
  const { messages } = ctx;
  const columns = ctx.columns.filter((item) => !item.hidden || item.id === initial?.columnId);
  const [draft, setDraft] = useState<FormatRuleDraft>(() => (initial ? ruleToDraft(initial) : emptyDraft()));
  const [error, setError] = useState<FormatRuleError | null>(null);
  const columnName = useId();
  const scopeName = useId();
  const title = initial ? messages.formatEditTitle : messages.formatAddTitle;
  const column = columns.find((item) => item.id === draft.columnId);
  const kind = valueKind(draft.operator, column?.type);
  const valueCount = isFormatOperator(draft.operator) ? operatorValueCount(draft.operator) : 0;

  const patch = (next: Partial<FormatRuleDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setError(null);
  };

  const errorText = (code: FormatRuleError) => {
    switch (code) {
      case 'column':
        return messages.formatValidationColumn;
      case 'operator':
        return messages.formatValidationOperator;
      case 'value':
        return messages.formatValidationValue;
      case 'range':
        return messages.formatValidationRange;
      case 'number':
        return messages.formatValidationNumber;
      case 'date':
        return messages.formatValidationDate;
      default: {
        const exhaustive: never = code;
        void exhaustive;
        return messages.formatValidationValue;
      }
    }
  };

  const save = () => {
    const result = draftToRule(draft, initial?.id ?? createRuleId(), column?.type);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(result.rule);
  };

  const inputType = kind === 'date' ? 'date' : 'text';

  return (
    <Popover
      open
      onClose={onCancel}
      anchorRef={anchorRef}
      label={title}
      className="aits-format-editor"
      alignEnd
    >
      <div className="aits-popover-title">{title}</div>
      <fieldset className="aits-export-fieldset">
        <legend className="aits-export-legend">{messages.formatColumn}</legend>
        <div className="aits-format-columns" role="radiogroup" aria-label={messages.formatColumn}>
          {columns.map((item) => (
            <label key={item.id} className="aits-enum-option">
              <input
                type="radio"
                name={columnName}
                checked={draft.columnId === item.id}
                onChange={() => patch({ columnId: item.id })}
              />
              <span>{item.header}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="aits-export-fieldset">
        <legend className="aits-export-legend">{messages.formatOperator}</legend>
        <select
          className="aits-input"
          aria-label={messages.formatOperator}
          value={draft.operator}
          onChange={(event) =>
            patch({ operator: event.target.value as FormatOperator | '', value: '', value2: '' })
          }
        >
          <option value="">{messages.formatOperatorPlaceholder}</option>
          {FORMAT_OPERATORS.map((operator) => (
            <option key={operator} value={operator}>
              {messages.formatOperators[operator]}
            </option>
          ))}
        </select>
        {valueCount >= 1 && (
          <div className="aits-format-values">
            <input
              className="aits-input"
              type={inputType}
              aria-label={messages.formatValue}
              value={draft.value}
              onChange={(event) => patch({ value: event.target.value })}
            />
            {valueCount === 2 && (
              <>
                <span className="aits-filter-and">{messages.formatValueTo}</span>
                <input
                  className="aits-input"
                  type={inputType}
                  aria-label={`${messages.formatValue} 2`}
                  value={draft.value2}
                  onChange={(event) => patch({ value2: event.target.value })}
                />
              </>
            )}
          </div>
        )}
      </fieldset>
      <fieldset className="aits-export-fieldset">
        <legend className="aits-export-legend">{messages.formatScope}</legend>
        {(['cell', 'row'] as const).map((scope) => (
          <label key={scope} className="aits-enum-option">
            <input
              type="radio"
              name={scopeName}
              checked={draft.scope === scope}
              onChange={() => patch({ scope })}
            />
            <span>{scope === 'cell' ? messages.formatScopeCell : messages.formatScopeRow}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="aits-export-fieldset">
        <legend className="aits-export-legend">{messages.formatPreview}</legend>
        <ColorField
          label={messages.formatBackground}
          applyLabel={messages.formatUseColor}
          value={draft.backgroundColor}
          fallback={DEFAULT_BACKGROUND}
          onChange={(backgroundColor) => patch({ backgroundColor })}
        />
        <ColorField
          label={messages.formatText}
          applyLabel={messages.formatUseColor}
          value={draft.textColor}
          fallback={DEFAULT_TEXT}
          onChange={(textColor) => patch({ textColor })}
        />
        <label className="aits-format-field">
          <span>{messages.formatFontWeight}</span>
          <select
            className="aits-input"
            aria-label={messages.formatFontWeight}
            value={draft.fontWeight}
            onChange={(event) => patch({ fontWeight: event.target.value as FormatFontWeight })}
          >
            {FONT_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {messages.formatFontWeights[weight]}
              </option>
            ))}
          </select>
        </label>
        <label className="aits-format-field">
          <span>{messages.formatFontStyle}</span>
          <select
            className="aits-input"
            aria-label={messages.formatFontStyle}
            value={draft.fontStyle}
            onChange={(event) => patch({ fontStyle: event.target.value as FormatFontStyle })}
          >
            {FONT_STYLES.map((fontStyle) => (
              <option key={fontStyle} value={fontStyle}>
                {messages.formatFontStyles[fontStyle]}
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
        <button type="button" className="aits-button" data-active onClick={save}>
          {messages.formatSave}
        </button>
      </div>
    </Popover>
  );
}

function ColorField({
  label,
  applyLabel,
  value,
  fallback,
  onChange,
}: {
  label: string;
  applyLabel: string;
  value: string;
  fallback: string;
  onChange(value: string): void;
}) {
  const enabled = value !== '';
  return (
    <div className="aits-format-color">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          aria-label={`${applyLabel} ${label}`}
          onChange={(event) => onChange(event.target.checked ? fallback : '')}
        />
        <span>{label}</span>
      </label>
      <input
        type="color"
        aria-label={label}
        disabled={!enabled}
        value={enabled ? value : fallback}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
