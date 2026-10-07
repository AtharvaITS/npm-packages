import { useRef, useState } from 'react';
import { useGrid } from '../state/GridContext';
import { Popover } from '../toolbar/Popover';
import type { ConditionalFormatRule } from '../types';
import { FormatIcon } from '../views/icons';
import { useConditionalFormat } from './FormatContext';
import { HeaderStyleEditor } from './HeaderStyleEditor';
import { RuleEditor } from './RuleEditor';
import { describeRule, formatToStyle } from './evaluate';
import {
  EMPTY_HEADER_STYLE,
  describeHeaderStyle,
  hasHeaderStyle,
  headerStyleToCss,
} from './headerStyle';

interface EditorState {
  rule: ConditionalFormatRule | null;
}

/** Toolbar Format button: rule list, rule editor, and header style. */
export function FormatButton() {
  const ctx = useGrid();
  const { messages } = ctx;
  const { rules, setRules, headerStyle, setHeaderStyle } = useConditionalFormat();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [headerOpen, setHeaderOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const closeEditor = () => setEditor(null);
  const closeHeader = () => setHeaderOpen(false);

  const openEditor = (rule: ConditionalFormatRule | null) => {
    closeHeader();
    setEditor({ rule });
  };

  const openHeader = () => {
    closeEditor();
    setHeaderOpen(true);
  };

  const save = (rule: ConditionalFormatRule) => {
    const exists = rules.some((item) => item.id === rule.id);
    setRules(exists ? rules.map((item) => (item.id === rule.id ? rule : item)) : [...rules, rule]);
    closeEditor();
  };

  const remove = (id: string) => {
    setRules(rules.filter((item) => item.id !== id));
    if (editor?.rule?.id === id) closeEditor();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="aits-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-active={rules.length > 0 || hasHeaderStyle(headerStyle) || undefined}
        onClick={() => {
          if (open) {
            closeEditor();
            closeHeader();
          }
          setOpen((current) => !current);
        }}
      >
        <FormatIcon />
        <span>{messages.format}</span>
        {rules.length > 0 && <span className="aits-badge">{rules.length}</span>}
      </button>
      <Popover
        open={open && editor === null && !headerOpen}
        onClose={() => setOpen(false)}
        anchorRef={button}
        label={messages.formatTitle}
        className="aits-format-panel"
        centered
      >
        <div className="aits-popover-title">{messages.formatTitle}</div>
        <div className="aits-popover-actions">
          <button
            type="button"
            className="aits-button"
            onClick={() => openEditor(null)}
          >
            {messages.formatAdd}
          </button>
          <button type="button" className="aits-button" onClick={openHeader}>
            {messages.headerStyle}
          </button>
        </div>
        {rules.length === 0 ? (
          <p className="aits-format-empty">{messages.formatEmpty}</p>
        ) : (
          <div className="aits-format-rules">
            <div className="aits-export-legend">{messages.formatRules}</div>
            {rules.map((rule) => {
              const column = ctx.columns.find((item) => item.id === rule.columnId);
              const summary = describeRule(rule, column?.header ?? rule.columnId, {
                operator: messages.formatOperators[rule.operator],
                scope: rule.scope === 'row' ? messages.formatScopeRow : messages.formatScopeCell,
                background: messages.formatBackground,
                text: messages.formatText,
                font: messages.formatFont,
                fontWeight: messages.formatFontWeights[rule.style.fontWeight ?? 'default'],
                fontStyle: messages.formatFontStyles[rule.style.fontStyle ?? 'default'],
              });
              return (
                <div className="aits-format-rule" key={rule.id}>
                  <span className="aits-format-swatch" style={formatToStyle(rule.style)} aria-hidden="true">
                    Aa
                  </span>
                  <div className="aits-format-rule-body">
                    <div className="aits-format-rule-title">{summary.title}</div>
                    {summary.details.map((line) => (
                      <div className="aits-format-rule-detail" key={line}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="aits-format-rule-actions">
                    <button
                      type="button"
                      className="aits-button aits-button-quiet"
                      onClick={() => openEditor(rule)}
                    >
                      {messages.formatEdit}
                    </button>
                    <button
                      type="button"
                      className="aits-button aits-button-quiet"
                      aria-label={`${messages.formatDelete} ${summary.title}`}
                      onClick={() => remove(rule.id)}
                    >
                      {messages.formatDelete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hasHeaderStyle(headerStyle) && (
          <div className="aits-format-rules">
            <div className="aits-export-legend">{messages.headerStyle}</div>
            <div className="aits-format-rule">
              <span className="aits-format-swatch" style={headerStyleToCss(headerStyle)} aria-hidden="true">
                Aa
              </span>
              <div className="aits-format-rule-body">
                <div className="aits-format-rule-title">{messages.headerStyle}</div>
                {describeHeaderStyle(headerStyle, {
                  background: messages.headerStyleBackground,
                  text: messages.headerStyleText,
                  fontSize: messages.headerStyleFontSize,
                  fontSizeUnit: messages.headerStyleFontSizeUnit,
                  fontWeight: messages.headerStyleFontWeight,
                  textTransform: messages.headerStyleTextTransform,
                  weights: messages.headerStyleFontWeights,
                  transforms: messages.headerStyleTransforms,
                }).map((line) => (
                  <div className="aits-format-rule-detail" key={line}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="aits-format-rule-actions">
                <button type="button" className="aits-button aits-button-quiet" onClick={openHeader}>
                  {messages.formatEdit}
                </button>
                <button
                  type="button"
                  className="aits-button aits-button-quiet"
                  aria-label={`${messages.formatDelete} ${messages.headerStyle}`}
                  onClick={() => {
                    setHeaderStyle(EMPTY_HEADER_STYLE);
                    closeHeader();
                  }}
                >
                  {messages.formatDelete}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="aits-popover-actions aits-format-actions-end">
          <button
            type="button"
            className="aits-button"
            onClick={() => {
              closeEditor();
              closeHeader();
              setOpen(false);
            }}
          >
            {messages.formatClose}
          </button>
        </div>
      </Popover>
      {editor && (
        <RuleEditor
          key={editor.rule?.id ?? 'new'}
          anchorRef={button}
          initial={editor.rule}
          onCancel={closeEditor}
          onSave={save}
        />
      )}
      {headerOpen && (
        <HeaderStyleEditor
          anchorRef={button}
          initial={headerStyle}
          onCancel={closeHeader}
          onApply={(style) => {
            setHeaderStyle(style);
            closeHeader();
          }}
        />
      )}
    </>
  );
}
