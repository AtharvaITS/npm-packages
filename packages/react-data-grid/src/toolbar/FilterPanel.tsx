import { useId, useRef, useState } from 'react';
import type { EffectiveColumn } from '../core/columnState';
import { isConditionActive, operatorNeedsValue, operatorsFor } from '../core/filter';
import { formatValue } from '../core/format';
import { useGrid } from '../state/GridContext';
import type { FilterCondition, FilterOperator } from '../types';
import { CloseIcon, FilterIcon } from '../views/icons';
import { Popover } from './Popover';

function toInputDate(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${m}-${d}`;
  }
  return '';
}

function ValueInput({
  column,
  value,
  onChange,
  label,
}: {
  column: EffectiveColumn;
  value: unknown;
  onChange(value: unknown): void;
  label: string;
}) {
  const numeric =
    column.type === 'number' || column.type === 'currency' || column.type === 'percent';
  if (column.type === 'date') {
    return (
      <input
        type="date"
        className="aits-input"
        aria-label={label}
        value={toInputDate(value)}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  }
  return (
    <input
      type={numeric ? 'number' : 'text'}
      className="aits-input"
      aria-label={label}
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') onChange(undefined);
        else onChange(numeric ? Number(raw) : raw);
      }}
    />
  );
}

function EnumPicker({
  column,
  value,
  onChange,
  locale,
}: {
  column: EffectiveColumn;
  value: unknown;
  onChange(value: unknown[]): void;
  locale: string;
}) {
  const selected = new Set(Array.isArray(value) ? value : value !== undefined ? [value] : []);
  return (
    <div className="aits-enum-picker" role="group" aria-label={column.header}>
      {(column.enumValues ?? []).map((option) => {
        const label = formatValue(option, column, { locale }) || '—';
        return (
          <label key={String(option)} className="aits-enum-option">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(option);
                else next.delete(option);
                onChange(Array.from(next));
              }}
            />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Filter button + popover dialog + removable chips (FR-019, FR-020). */
export function FilterPanel() {
  const ctx = useGrid();
  const { messages, api } = ctx;
  const filters = api.state.filters;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const filterable = ctx.columns.filter((c) => c.filterable && !c.hidden);
  const activeCount = filters.filter((f) => isConditionActive(f, ctx.columns)).length;

  if (filterable.length === 0) return null;

  const update = (index: number, patch: Partial<FilterCondition>) => {
    api.setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };
  const remove = (index: number) => api.setFilters(filters.filter((_, i) => i !== index));
  const add = () => {
    const column = filterable[0]!;
    const operator = operatorsFor(column.type, !!column.enumValues)[0]!;
    api.setFilters([...filters, { columnId: column.id, operator }]);
  };

  const describe = (f: FilterCondition) => {
    const column = ctx.columns.find((c) => c.id === f.columnId);
    if (!column) return '';
    const op = messages.operators[f.operator] ?? f.operator;
    if (!operatorNeedsValue(f.operator)) return `${column.header} ${op}`;
    const fmt = (v: unknown) =>
      Array.isArray(v)
        ? v.map((x) => formatValue(x, column, ctx.formatOptions)).join(', ')
        : formatValue(v, column, ctx.formatOptions);
    const value = f.operator === 'between' ? `${fmt(f.value)} – ${fmt(f.value2)}` : fmt(f.value);
    return `${column.header} ${op} ${value}`;
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="aits-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-active={activeCount > 0 || undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <FilterIcon />
        <span>{messages.filter}</span>
        {activeCount > 0 && <span className="aits-badge">{activeCount}</span>}
      </button>
      {filters.map((f, i) =>
        isConditionActive(f, ctx.columns) ? (
          <span className="aits-chip" key={i}>
            <span className="aits-chip-label">{describe(f)}</span>
            <button
              type="button"
              className="aits-icon-button"
              aria-label={`${messages.removeFilter}: ${describe(f)}`}
              onClick={() => remove(i)}
            >
              <CloseIcon />
            </button>
          </span>
        ) : null,
      )}
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={button}
        label={messages.filter}
        className="aits-filter-panel"
      >
        <div className="aits-popover-title" id={titleId}>
          {messages.filter}
        </div>
        {filters.map((f, i) => {
          const column = filterable.find((c) => c.id === f.columnId) ?? filterable[0]!;
          const ops = operatorsFor(column.type, !!column.enumValues);
          const needsValue = operatorNeedsValue(f.operator);
          return (
            <div
              className="aits-filter-row"
              key={i}
              role="group"
              aria-label={describe(f) || messages.filter}
            >
              <select
                className="aits-input"
                aria-label={messages.filterColumn}
                value={column.id}
                onChange={(e) => {
                  const next = filterable.find((c) => c.id === e.target.value)!;
                  const nextOps = operatorsFor(next.type, !!next.enumValues);
                  update(i, {
                    columnId: next.id,
                    operator: nextOps.includes(f.operator) ? f.operator : nextOps[0]!,
                    value: undefined,
                    value2: undefined,
                  });
                }}
              >
                {filterable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.header}
                  </option>
                ))}
              </select>
              <select
                className="aits-input"
                aria-label={messages.filterOperator}
                value={f.operator}
                onChange={(e) =>
                  update(i, {
                    operator: e.target.value as FilterOperator,
                    value: undefined,
                    value2: undefined,
                  })
                }
              >
                {ops.map((op) => (
                  <option key={op} value={op}>
                    {messages.operators[op]}
                  </option>
                ))}
              </select>
              {needsValue &&
                (f.operator === 'in' ? (
                  <EnumPicker
                    column={column}
                    value={f.value}
                    onChange={(v) => update(i, { value: v })}
                    locale={ctx.locale}
                  />
                ) : (
                  <>
                    <ValueInput
                      column={column}
                      value={f.value}
                      label={messages.filterValue}
                      onChange={(v) => update(i, { value: v })}
                    />
                    {f.operator === 'between' && (
                      <>
                        <span className="aits-filter-and">{messages.filterValueTo}</span>
                        <ValueInput
                          column={column}
                          value={f.value2}
                          label={`${messages.filterValue} 2`}
                          onChange={(v) => update(i, { value2: v })}
                        />
                      </>
                    )}
                  </>
                ))}
              <button
                type="button"
                className="aits-icon-button"
                aria-label={messages.removeFilter}
                onClick={() => remove(i)}
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
        <div className="aits-popover-actions">
          <button type="button" className="aits-button" onClick={add}>
            {messages.addFilter}
          </button>
          {filters.length > 0 && (
            <button
              type="button"
              className="aits-button aits-button-quiet"
              onClick={() => api.setFilters([])}
            >
              {messages.clearAll}
            </button>
          )}
        </div>
      </Popover>
    </>
  );
}
