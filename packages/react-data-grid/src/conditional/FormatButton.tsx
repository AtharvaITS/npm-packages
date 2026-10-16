import { useRef, useState } from 'react';
import { useGrid } from '../state/GridContext';
import { Popover } from '../toolbar/Popover';
import type { ConditionalFormatRule } from '../types';
import { FormatIcon } from '../views/icons';
import { useConditionalFormat } from './FormatContext';
import { RuleEditor } from './RuleEditor';
import { describeRule, formatToStyle } from './evaluate';

interface EditorState {
  rule: ConditionalFormatRule | null;
}

/** Toolbar Format button: rule list, and a second dialog to add or edit a rule. */
export function FormatButton() {
  const ctx = useGrid();
  const { messages } = ctx;
  const { rules, setRules } = useConditionalFormat();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  const closeEditor = () => setEditor(null);

  const openEditor = (rule: ConditionalFormatRule | null) => {
    setEditor({ rule });
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
        data-active={rules.length > 0 || undefined}
        onClick={() => {
          if (open) closeEditor();
          setOpen((current) => !current);
        }}
      >
        <FormatIcon />
        <span>{messages.format}</span>
        {rules.length > 0 && <span className="aits-badge">{rules.length}</span>}
      </button>
      <Popover
        open={open && editor === null}
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
        <div className="aits-popover-actions aits-format-actions-end">
          <button
            type="button"
            className="aits-button"
            onClick={() => {
              closeEditor();
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
    </>
  );
}
