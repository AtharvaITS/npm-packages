import type { FilterCondition, FilterOperator } from '../types';
import { getColumnValue, isEmptyValue, type ResolvedColumn, type ResolvedType } from './columns';
import { toDate, toNumber } from './format';
import { fold, rawText } from './search';

/** Operators allowed per column type (data model §7). */
export function operatorsFor(type: ResolvedType, hasEnum: boolean): FilterOperator[] {
  switch (type) {
    case 'number':
    case 'currency':
    case 'percent':
      return ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'isEmpty', 'isNotEmpty'];
    case 'date':
      return ['before', 'after', 'on', 'between', 'isEmpty', 'isNotEmpty'];
    case 'boolean':
      return ['isTrue', 'isFalse', 'isEmpty'];
    default: {
      const text: FilterOperator[] = [
        'contains',
        'equals',
        'startsWith',
        'endsWith',
        'isEmpty',
        'isNotEmpty',
      ];
      return hasEnum || type === 'enum' ? ['in', ...text] : text;
    }
  }
}

export function operatorNeedsValue(op: FilterOperator): boolean {
  return !(op === 'isEmpty' || op === 'isNotEmpty' || op === 'isTrue' || op === 'isFalse');
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

type Predicate = (value: unknown) => boolean;

function isValueEmpty(value: unknown) {
  return isEmptyValue(value) || (typeof value === 'number' && Number.isNaN(value));
}

function numberPredicate(op: FilterOperator, a: number, lo: number, hi: number): Predicate {
  return (v) => {
    const n = toNumber(v);
    if (n === undefined || Number.isNaN(n)) return false;
    switch (op) {
      case 'eq':
        return n === a;
      case 'neq':
        return n !== a;
      case 'lt':
        return n < a;
      case 'lte':
        return n <= a;
      case 'gt':
        return n > a;
      case 'gte':
        return n >= a;
      case 'between':
        return n >= lo && n <= hi;
      default:
        return false;
    }
  };
}

function datePredicate(op: FilterOperator, a: number, lo: number, hi: number): Predicate {
  return (v) => {
    const d = toDate(v);
    if (!d) return false;
    const t = startOfDay(d);
    switch (op) {
      case 'before':
        return t < a;
      case 'after':
        return t > a;
      case 'on':
        return t === a;
      case 'between':
        return t >= lo && t <= hi; // inclusive on both ends
      default:
        return false;
    }
  };
}

function textPredicate(op: FilterOperator, needle: string): Predicate {
  return (v) => {
    const text = fold(rawText(v));
    switch (op) {
      case 'contains':
        return text.includes(needle);
      case 'equals':
        return text === needle;
      case 'startsWith':
        return text.startsWith(needle);
      case 'endsWith':
        return text.endsWith(needle);
      default:
        return false;
    }
  };
}

/** Builds a predicate for a condition, or undefined when the condition is invalid. */
export function buildPredicate(
  condition: FilterCondition,
  column: ResolvedColumn,
): Predicate | undefined {
  const op = condition.operator;
  const allowed = operatorsFor(column.type, !!column.enumValues);
  if (!allowed.includes(op)) return undefined;
  if (op === 'isEmpty') return isValueEmpty;
  if (op === 'isNotEmpty') return (v) => !isValueEmpty(v);
  if (op === 'isTrue') return (v) => v === true;
  if (op === 'isFalse') return (v) => v === false;

  const { value, value2 } = condition;
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;

  switch (column.type) {
    case 'number':
    case 'currency':
    case 'percent': {
      const a = toNumber(value);
      if (a === undefined) return undefined;
      const b = op === 'between' ? toNumber(value2) : undefined;
      if (op === 'between' && b === undefined) return undefined;
      const lo = b !== undefined ? Math.min(a, b) : a;
      const hi = b !== undefined ? Math.max(a, b) : a;
      return numberPredicate(op, a, lo, hi);
    }
    case 'date': {
      const da = toDate(value);
      if (!da) return undefined;
      const a = startOfDay(da);
      let b: number | undefined;
      if (op === 'between') {
        const db = toDate(value2);
        if (!db) return undefined;
        b = startOfDay(db);
      }
      const lo = b !== undefined ? Math.min(a, b) : a;
      const hi = b !== undefined ? Math.max(a, b) : a;
      return datePredicate(op, a, lo, hi);
    }
    default: {
      if (op === 'in') {
        const list = (Array.isArray(value) ? value : [value]).map((x) => fold(rawText(x)));
        const set = new Set(list);
        return (v) => set.has(fold(rawText(v)));
      }
      return textPredicate(op, fold(rawText(value)));
    }
  }
}

/** Applies all valid conditions with AND (FR-019). Invalid conditions are ignored. */
export function filterIndexes<TRow>(
  rows: readonly TRow[],
  indexes: readonly number[],
  conditions: readonly FilterCondition[],
  columns: readonly ResolvedColumn<TRow>[],
): number[] {
  const active: { column: ResolvedColumn<TRow>; test: Predicate }[] = [];
  for (const condition of conditions) {
    const column = columns.find((c) => c.id === condition.columnId);
    if (!column || !column.filterable) continue;
    const test = buildPredicate(condition, column as ResolvedColumn);
    if (test) active.push({ column, test });
  }
  if (active.length === 0) return indexes.slice();
  const out: number[] = [];
  outer: for (const i of indexes) {
    const row = rows[i] as TRow;
    for (const { column, test } of active) {
      if (!test(getColumnValue(row, column))) continue outer;
    }
    out.push(i);
  }
  return out;
}

/** True when a condition would actually filter (drives the "active filter" UI). */
export function isConditionActive(
  condition: FilterCondition,
  columns: readonly ResolvedColumn[],
): boolean {
  const column = columns.find((c) => c.id === condition.columnId);
  return !!column && column.filterable && !!buildPredicate(condition, column);
}
