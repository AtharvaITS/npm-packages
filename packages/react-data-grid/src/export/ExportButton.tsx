import { useId, useRef, useState } from 'react';
import { useGrid } from '../state/GridContext';
import { Popover } from '../toolbar/Popover';
import type { ExportFormat, ExportScope } from '../types';
import { ExportIcon } from '../views/icons';
import { collectExport } from './collectExport';
import { downloadBlob } from './download';
import { buildExportBlob, exportFileName } from './file';

const SCOPES: ExportScope[] = ['view', 'all', 'page', 'selected'];
const FORMATS: ExportFormat[] = ['csv', 'excel', 'pdf'];

/**
 * Toolbar Export button. Opens a dialog for scope and format, then downloads
 * the file. It only reads grid state; it does not change sort, filters, page, or selection.
 */
export function ExportButton() {
  const ctx = useGrid();
  const { messages } = ctx;
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ExportScope>('view');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [notice, setNotice] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const scopeName = useId();
  const formatName = useId();
  const selectedCount = ctx.selection.selected.size;
  const serverLimited = ctx.serverMode && scope === 'all' && ctx.totalCount > ctx.rows.length;

  const scopeLabel: Record<ExportScope, string> = {
    view: messages.exportScopeView,
    all: messages.exportScopeAll,
    page: messages.exportScopePage,
    selected: messages.exportScopeSelected,
  };
  const formatLabel: Record<ExportFormat, string> = {
    csv: messages.exportFormatCsv,
    excel: messages.exportFormatExcel,
    pdf: messages.exportFormatPdf,
  };

  const close = () => {
    setOpen(false);
    setNotice(null);
  };

  const runExport = () => {
    if (scope === 'selected' && selectedCount === 0) {
      setNotice(messages.exportNoneSelected);
      return;
    }
    const table = collectExport({
      scope,
      rows: ctx.rows,
      rowIds: ctx.rowIds,
      columns: ctx.columns,
      visibleColumns: ctx.visibleColumns,
      search: ctx.api.state.search,
      filters: ctx.api.state.filters,
      sort: ctx.api.state.sort,
      locale: ctx.locale,
      serverMode: ctx.serverMode,
      displayIndexes: ctx.displayIndexes,
      selectedIds: ctx.selection.selected,
      formatOptions: ctx.formatOptions,
    });
    if (table.headers.length === 0 || table.rows.length === 0) {
      setNotice(messages.exportEmpty);
      return;
    }
    downloadBlob(buildExportBlob(table, format), exportFileName(ctx.props.exportFileName, format));
    ctx.announce(messages.exportDone(table.rows.length));
    close();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="aits-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setNotice(null);
          setOpen((current) => !current);
        }}
      >
        <ExportIcon />
        <span>{messages.exportLabel}</span>
      </button>
      <Popover
        open={open}
        onClose={close}
        anchorRef={button}
        label={messages.exportTitle}
        className="aits-export-panel"
        alignEnd
      >
        <div className="aits-popover-title">{messages.exportTitle}</div>
        <fieldset className="aits-export-fieldset">
          <legend className="aits-export-legend">{messages.exportScope}</legend>
          {SCOPES.map((option) => {
            const disabled = option === 'selected' && selectedCount === 0;
            return (
              <label key={option} className="aits-enum-option">
                <input
                  type="radio"
                  name={scopeName}
                  checked={scope === option}
                  disabled={disabled}
                  onChange={() => {
                    setScope(option);
                    setNotice(null);
                  }}
                />
                <span>{scopeLabel[option]}</span>
              </label>
            );
          })}
        </fieldset>
        <fieldset className="aits-export-fieldset">
          <legend className="aits-export-legend">{messages.exportFormat}</legend>
          {FORMATS.map((option) => (
            <label key={option} className="aits-enum-option">
              <input
                type="radio"
                name={formatName}
                checked={format === option}
                onChange={() => {
                  setFormat(option);
                  setNotice(null);
                }}
              />
              <span>{formatLabel[option]}</span>
            </label>
          ))}
        </fieldset>
        {serverLimited && <p className="aits-export-note">{messages.exportServerNote}</p>}
        {notice && (
          <p className="aits-export-notice" role="status">
            {notice}
          </p>
        )}
        <div className="aits-popover-actions">
          <button type="button" className="aits-button" onClick={close}>
            {messages.exportCancel}
          </button>
          <button type="button" className="aits-button" data-active onClick={runExport}>
            {messages.exportAction}
          </button>
        </div>
      </Popover>
    </>
  );
}
