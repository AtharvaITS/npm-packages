import type { CSSProperties } from 'react';
import { getColumnValue, isEmptyValue, type ResolvedType } from '../core/columns';
import { toDate, toNumber } from '../core/format';
import { fold, rawText } from '../core/search';
import type {
  ColumnDef,
  ConditionalFormatRule,
  ConditionalFormatStyle,
  FormatFontStyle,
  FormatFontWeight,
  FormatOperator,
  FormatScope,
} from '../types';

export const FORMAT_OPERATORS: readonly FormatOperator[] = [
  'equal',
  'notEqual',
  'isEmpty',
  'isNotEmpty',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'between',
  'notBetween',
  'lt',
  'lte',
  'gt',
  'gte',
];

const OPERATOR_SET = new Set<string>(FORMAT_OPERATORS);

export type FormatColumn<TRow = any> = ColumnDef<TRow> & { id: string; type?: ResolvedType | string };

export interface FormatRuleDraft {
  columnId: string;
  operator: FormatOperator | '';
  value: string;
  value2: string;
  scope: FormatScope;
  backgroundColor: string;
  textColor: string;
  fontWeight: FormatFontWeight;
  fontStyle: FormatFontStyle;
}

export type FormatRuleError = 'column' | 'operator' | 'value' | 'range' | 'number' | 'date';

export function isFormatOperator(value: string): value is FormatOperator {
  return OPERATOR_SET.has(value);
}

export function operatorValueCount(operator: FormatOperator): 0 | 1 | 2 {
  switch (operator) {
    case 'isEmpty':
    case 'isNotEmpty':
      return 0;
    case 'between':
    case 'notBetween':
      return 2;
    case 'equal':
    case 'notEqual':
    case 'contains':
    case 'notContains':
    case 'startsWith':
    case 'endsWith':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
      return 1;
    default: {
      const exhaustive: never = operator;
      void exhaustive;
      return 0;
    }
  }
}

export function isNumericOperator(operator: FormatOperator): boolean {
  switch (operator) {
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
    case 'between':
    case 'notBetween':
      return true;
    case 'equal':
    case 'notEqual':
    case 'isEmpty':
    case 'isNotEmpty':
    case 'contains':
    case 'notContains':
    case 'startsWith':
    case 'endsWith':
      return false;
    default: {
      const exhaustive: never = operator;
      void exhaustive;
      return false;
    }
  }
}

export function emptyDraft(): FormatRuleDraft {
  return {
    columnId: '',
    operator: '',
    value: '',
    value2: '',
    scope: 'cell',
    backgroundColor: '',
    textColor: '',
    fontWeight: 'default',
    fontStyle: 'default',
  };
}

export function ruleToDraft(rule: ConditionalFormatRule): FormatRuleDraft {
  return {
    columnId: rule.columnId,
    operator: rule.operator,
    value: rule.value ?? '',
    value2: rule.value2 ?? '',
    scope: rule.scope,
    backgroundColor: rule.style.backgroundColor ?? '',
    textColor: rule.style.textColor ?? '',
    fontWeight: rule.style.fontWeight ?? 'default',
    fontStyle: rule.style.fontStyle ?? 'default',
  };
}

export function createRuleId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID();
  return `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseFinite(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n === undefined || !Number.isFinite(n)) return undefined;
  return n;
}

function dateNumber(value: unknown): number | undefined {
  const date = toDate(value);
  if (!date) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isBlank(value: unknown): boolean {
  if (isEmptyValue(value)) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

function cellTexts(value: unknown): string[] {
  const texts = new Set<string>();
  texts.add(fold(rawText(value)));
  if (value === true) {
    texts.add('true');
    texts.add('yes');
  } else if (value === false) {
    texts.add('false');
    texts.add('no');
  }
  return Array.from(texts);
}

function textEquals(cell: unknown, needleRaw: string): boolean {
  const needleNum = parseFinite(needleRaw);
  const cellNum = parseFinite(cell);
  if (needleNum !== undefined && cellNum !== undefined) return cellNum === needleNum;
  const needle = fold(needleRaw.trim());
  return cellTexts(cell).some((text) => text === needle);
}

function textIncludes(cell: unknown, needleRaw: string, mode: 'contains' | 'startsWith' | 'endsWith'): boolean {
  const needle = fold(needleRaw.trim());
  if (!needle) return false;
  return cellTexts(cell).some((text) => {
    switch (mode) {
      case 'contains':
        return text.includes(needle);
      case 'startsWith':
        return text.startsWith(needle);
      case 'endsWith':
        return text.endsWith(needle);
      default: {
        const exhaustive: never = mode;
        void exhaustive;
        return false;
      }
    }
  });
}

type NumericOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'notBetween';

function compareNumeric(
  operator: NumericOperator,
  cell: unknown,
  rawA: string,
  rawB: string,
  asDate: boolean,
): boolean {
  const left = asDate ? dateNumber(cell) : parseFinite(cell);
  const a = asDate ? dateNumber(rawA) : parseFinite(rawA);
  if (left === undefined || a === undefined) return false;
  switch (operator) {
    case 'lt':
      return left < a;
    case 'lte':
      return left <= a;
    case 'gt':
      return left > a;
    case 'gte':
      return left >= a;
    case 'between':
    case 'notBetween': {
      const b = asDate ? dateNumber(rawB) : parseFinite(rawB);
      if (b === undefined) return false;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const inside = left >= lo && left <= hi;
      return operator === 'between' ? inside : !inside;
    }
    default: {
      const exhaustive: never = operator;
      void exhaustive;
      return false;
    }
  }
}

export function compareOperator(
  operator: FormatOperator,
  cell: unknown,
  rawValue: string,
  rawValue2: string,
  asDate: boolean,
): boolean {
  switch (operator) {
    case 'isEmpty':
      return isBlank(cell);
    case 'isNotEmpty':
      return !isBlank(cell);
    case 'equal':
      return textEquals(cell, rawValue);
    case 'notEqual':
      return !textEquals(cell, rawValue);
    case 'contains':
      return textIncludes(cell, rawValue, 'contains');
    case 'notContains':
      return !textIncludes(cell, rawValue, 'contains');
    case 'startsWith':
      return textIncludes(cell, rawValue, 'startsWith');
    case 'endsWith':
      return textIncludes(cell, rawValue, 'endsWith');
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
    case 'between':
    case 'notBetween':
      return compareNumeric(operator, cell, rawValue, rawValue2, asDate);
    default: {
      const exhaustive: never = operator;
      void exhaustive;
      return false;
    }
  }
}

export function ruleMatches<TRow>(
  rule: ConditionalFormatRule,
  row: TRow,
  columns: readonly FormatColumn<TRow>[],
): boolean {
  if (!isFormatOperator(rule.operator)) return false;
  const column = columns.find((item) => item.id === rule.columnId);
  if (!column) return false;
  let cell: unknown;
  try {
    cell = getColumnValue(row, column);
  } catch {
    return false;
  }
  return compareOperator(
    rule.operator,
    cell,
    rule.value ?? '',
    rule.value2 ?? '',
    column.type === 'date',
  );
}

function mergeStyle(target: ConditionalFormatStyle, style: ConditionalFormatStyle | undefined) {
  if (!style) return;
  if (style.backgroundColor) target.backgroundColor = style.backgroundColor;
  if (style.textColor) target.textColor = style.textColor;
  if (style.fontWeight && style.fontWeight !== 'default') target.fontWeight = style.fontWeight;
  if (style.fontStyle && style.fontStyle !== 'default') target.fontStyle = style.fontStyle;
}

function hasPaint(style: ConditionalFormatStyle): boolean {
  return !!(
    style.backgroundColor ||
    style.textColor ||
    (style.fontWeight && style.fontWeight !== 'default') ||
    (style.fontStyle && style.fontStyle !== 'default')
  );
}

function collectStyle<TRow>(
  rules: readonly ConditionalFormatRule[],
  row: TRow,
  columns: readonly FormatColumn<TRow>[],
  accept: (rule: ConditionalFormatRule) => boolean,
): ConditionalFormatStyle | undefined {
  const style: ConditionalFormatStyle = {};
  for (const rule of rules) {
    if (!accept(rule)) continue;
    if (!ruleMatches(rule, row, columns)) continue;
    mergeStyle(style, rule.style);
  }
  return hasPaint(style) ? style : undefined;
}

/** Row-scoped rules only. Later rules override earlier ones per property. */
export function resolveRowFormat<TRow>(
  rules: readonly ConditionalFormatRule[],
  row: TRow,
  columns: readonly FormatColumn<TRow>[],
): ConditionalFormatStyle | undefined {
  return collectStyle(rules, row, columns, (rule) => rule.scope === 'row');
}

/**
 * Formatting for one cell. Row rules are applied first, then cell rules for
 * this column, so a cell rule wins over a row rule on the same property.
 */
export function resolveCellFormat<TRow>(
  rules: readonly ConditionalFormatRule[],
  row: TRow,
  columns: readonly FormatColumn<TRow>[],
  columnId: string,
): ConditionalFormatStyle | undefined {
  const style: ConditionalFormatStyle = {};
  for (const rule of rules) {
    if (rule.scope !== 'row') continue;
    if (!ruleMatches(rule, row, columns)) continue;
    mergeStyle(style, rule.style);
  }
  for (const rule of rules) {
    if (rule.scope !== 'cell' || rule.columnId !== columnId) continue;
    if (!ruleMatches(rule, row, columns)) continue;
    mergeStyle(style, rule.style);
  }
  return hasPaint(style) ? style : undefined;
}

/** Cell-scoped rules for one column, without row rules. */
export function resolveCellOnlyFormat<TRow>(
  rules: readonly ConditionalFormatRule[],
  row: TRow,
  columns: readonly FormatColumn<TRow>[],
  columnId: string,
): ConditionalFormatStyle | undefined {
  return collectStyle(
    rules,
    row,
    columns,
    (rule) => rule.scope === 'cell' && rule.columnId === columnId,
  );
}

export function formatToStyle(style: ConditionalFormatStyle | undefined): CSSProperties | undefined {
  if (!style || !hasPaint(style)) return undefined;
  const css: CSSProperties = {};
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.textColor) css.color = style.textColor;
  if (style.fontWeight === 'normal' || style.fontWeight === '600' || style.fontWeight === '700') {
    css.fontWeight = style.fontWeight;
  }
  if (style.fontStyle === 'normal' || style.fontStyle === 'italic') css.fontStyle = style.fontStyle;
  const vars = css as CSSProperties & Record<string, string>;
  if (style.backgroundColor) vars['--aits-cf-bg'] = style.backgroundColor;
  if (style.textColor) vars['--aits-cf-color'] = style.textColor;
  return css;
}

export function validateFormatRule(
  draft: FormatRuleDraft,
  columnType: string | undefined,
): FormatRuleError | null {
  if (!draft.columnId) return 'column';
  if (!isFormatOperator(draft.operator)) return 'operator';
  const count = operatorValueCount(draft.operator);
  if (count === 0) return null;
  const numeric = isNumericOperator(draft.operator);
  const asDate = columnType === 'date' && numeric;
  const validBound = (value: string) => (asDate ? toDate(value) !== undefined : parseFinite(value) !== undefined);
  if (count === 2) {
    if (!draft.value.trim() || !draft.value2.trim()) return 'range';
    if (numeric && (!validBound(draft.value) || !validBound(draft.value2))) {
      return asDate ? 'date' : 'number';
    }
    return null;
  }
  if (!draft.value.trim()) return 'value';
  if (numeric && !validBound(draft.value)) return asDate ? 'date' : 'number';
  return null;
}

export function draftToRule(
  draft: FormatRuleDraft,
  id: string,
  columnType: string | undefined,
): { ok: true; rule: ConditionalFormatRule } | { ok: false; error: FormatRuleError } {
  const error = validateFormatRule(draft, columnType);
  if (error || !isFormatOperator(draft.operator)) return { ok: false, error: error ?? 'operator' };
  const count = operatorValueCount(draft.operator);
  const rule: ConditionalFormatRule = {
    id,
    columnId: draft.columnId,
    operator: draft.operator,
    scope: draft.scope === 'row' ? 'row' : 'cell',
    style: {
      backgroundColor: draft.backgroundColor || undefined,
      textColor: draft.textColor || undefined,
      fontWeight: draft.fontWeight,
      fontStyle: draft.fontStyle,
    },
  };
  if (count >= 1) rule.value = draft.value.trim();
  if (count === 2) rule.value2 = draft.value2.trim();
  return { ok: true, rule };
}

export function describeRule(
  rule: ConditionalFormatRule,
  header: string,
  labels: {
    operator: string;
    scope: string;
    background: string;
    text: string;
    font: string;
    fontWeight: string;
    fontStyle: string;
  },
): { title: string; details: string[] } {
  const count = isFormatOperator(rule.operator) ? operatorValueCount(rule.operator) : 1;
  const value =
    count === 0 ? '' : count === 2 ? `${rule.value ?? ''} – ${rule.value2 ?? ''}` : (rule.value ?? '');
  const pieces = [header, labels.operator];
  if (value) pieces.push(value);
  pieces.push(labels.scope);
  const details: string[] = [];
  if (rule.style.backgroundColor) details.push(`${labels.background}: ${rule.style.backgroundColor}`);
  if (rule.style.textColor) details.push(`${labels.text}: ${rule.style.textColor}`);
  const fontBits: string[] = [];
  if (rule.style.fontWeight && rule.style.fontWeight !== 'default') fontBits.push(labels.fontWeight);
  if (rule.style.fontStyle && rule.style.fontStyle !== 'default') fontBits.push(labels.fontStyle);
  if (fontBits.length > 0) details.push(`${labels.font}: ${fontBits.join(', ')}`);
  return { title: pieces.join(' | '), details };
}
