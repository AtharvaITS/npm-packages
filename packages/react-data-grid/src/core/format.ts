import { warn } from '../dev/warn';
import type { ColumnDef, Messages } from '../types';
import { getColumnValue, type ResolvedColumn } from './columns';

export const DASH = '—';

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function safeLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    Intl.getCanonicalLocales(locale);
    return locale;
  } catch {
    return undefined;
  }
}

export function getNumberFormat(
  locale: string | undefined,
  options: Intl.NumberFormatOptions = {},
) {
  const key = (locale ?? '') + '|' + JSON.stringify(options);
  let fmt = numberFormats.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(safeLocale(locale), options);
    } catch {
      fmt = new Intl.NumberFormat(safeLocale(locale));
    }
    numberFormats.set(key, fmt);
  }
  return fmt;
}

export function getDateFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = (locale ?? '') + '|' + JSON.stringify(options);
  let fmt = dateFormats.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat(safeLocale(locale), options);
    } catch {
      fmt = new Intl.DateTimeFormat(safeLocale(locale), { dateStyle: 'medium' });
    }
    dateFormats.set(key, fmt);
  }
  return fmt;
}

export interface FormatOptions {
  locale?: string;
  messages?: Pick<Messages, 'yes' | 'no'>;
  warnKey?: object;
}

type FormatColumn = Pick<ResolvedColumn, 'type' | 'id'> & Pick<ColumnDef, 'formatOptions'>;

/** Converts a value to a Date when the column is declared as `date`. */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    // Date-only strings are local calendar dates (not UTC midnight).
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/** Converts a value to a number when the column is declared numeric. */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasCycle(value: unknown, stack: Set<unknown> = new Set(), depth = 0): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if (stack.has(value)) return true;
  if (depth > 20) return false;
  stack.add(value);
  const children = Array.isArray(value) ? value : isPlainObject(value) ? Object.values(value) : [];
  for (const child of children) {
    if (hasCycle(child, stack, depth + 1)) return true;
  }
  stack.delete(value);
  return false;
}

function formatNumber(n: number, column: FormatColumn | undefined, locale: string | undefined) {
  if (!Number.isFinite(n)) return DASH;
  const opts = column?.formatOptions ?? {};
  if (column?.type === 'currency') {
    return getNumberFormat(locale, {
      style: 'currency',
      currency: opts.currency ?? 'USD',
      ...stripDate(opts),
    }).format(n);
  }
  if (column?.type === 'percent') {
    return getNumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 2,
      ...stripDate(opts),
    }).format(n);
  }
  return getNumberFormat(locale, stripDate(opts)).format(n);
}

function stripDate(
  opts: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions,
): Intl.NumberFormatOptions {
  const { dateStyle: _a, timeStyle: _b, ...rest } = opts as any;
  // Only number options are meaningful to NumberFormat; unknown keys are ignored by Intl.
  return rest;
}

function formatDate(d: Date, column: FormatColumn | undefined, locale: string | undefined) {
  if (Number.isNaN(d.getTime())) return DASH;
  const opts = column?.formatOptions;
  const dateOpts: Intl.DateTimeFormatOptions =
    opts && (opts.dateStyle || opts.timeStyle || opts.year || opts.month || opts.day || opts.hour)
      ? pickDateOptions(opts)
      : { dateStyle: 'medium' };
  return getDateFormat(locale, dateOpts).format(d);
}

function pickDateOptions(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  const keys: (keyof Intl.DateTimeFormatOptions)[] = [
    'dateStyle',
    'timeStyle',
    'year',
    'month',
    'day',
    'weekday',
    'hour',
    'minute',
    'second',
    'hour12',
    'timeZone',
    'era',
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) if (opts[k] !== undefined) out[k] = opts[k];
  return out as Intl.DateTimeFormatOptions;
}

function formatPrimitive(value: unknown, locale: string | undefined, opts: FormatOptions): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return formatNumber(value, undefined, locale);
  if (typeof value === 'bigint') return value.toLocaleString(safeLocale(locale));
  if (typeof value === 'boolean')
    return value ? (opts.messages?.yes ?? 'Yes') : (opts.messages?.no ?? 'No');
  if (value instanceof Date) return formatDate(value, undefined, locale);
  return '';
}

function summarizeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  const shown = keys.slice(0, 2);
  return `{${shown.join(', ')}${keys.length > 2 ? `, +${keys.length - 2}` : ''}}`;
}

/**
 * Default, locale-aware display text for a value (data model §4.2).
 * Always returns plain text; never HTML.
 */
export function formatValue(
  value: unknown,
  column: FormatColumn | undefined,
  opts: FormatOptions = {},
): string {
  const locale = opts.locale;
  if (value === null || value === undefined || value === '') return '';

  const type = column?.type;
  if (
    (type === 'number' || type === 'currency' || type === 'percent') &&
    typeof value !== 'object'
  ) {
    const n = toNumber(value);
    if (n !== undefined) return formatNumber(n, column, locale);
  }
  if (type === 'date') {
    const d = value instanceof Date ? value : toDate(value);
    if (d) return formatDate(d, column, locale);
    if (value instanceof Date) return DASH;
  }

  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
      return formatNumber(value, column, locale);
    case 'bigint':
      return value.toLocaleString(safeLocale(locale));
    case 'boolean':
      return value ? (opts.messages?.yes ?? 'Yes') : (opts.messages?.no ?? 'No');
    case 'function':
    case 'symbol':
      warn(
        opts.warnKey,
        `Column "${column?.id ?? '?'}" contains ${typeof value} values, which cannot be displayed.`,
      );
      return '';
    default:
      break;
  }

  if (value instanceof Date) return formatDate(value, column, locale);
  if (hasCycle(value)) return '[Circular]';
  if (Array.isArray(value)) {
    const shown = value
      .slice(0, 3)
      .map((item) =>
        typeof item === 'object' && item !== null && !(item instanceof Date)
          ? Array.isArray(item)
            ? `[${item.length}]`
            : summarizeObject(item as Record<string, unknown>)
          : formatPrimitive(item, locale, opts),
      );
    return shown.join(', ') + (value.length > 3 ? ` +${value.length - 3}` : '');
  }
  if (isPlainObject(value)) return summarizeObject(value);
  try {
    const text = String(value);
    return text === '[object Object]' ? summarizeObject(value as Record<string, unknown>) : text;
  } catch {
    return '';
  }
}

/** Display text for a cell, honoring a column `format` override (display only, FR-021). */
export function formatCell<TRow>(
  row: TRow,
  column: ResolvedColumn<TRow>,
  opts: FormatOptions = {},
): string {
  const value = getColumnValue(row, column);
  if (column.format) {
    try {
      return String(column.format(value, row) ?? '');
    } catch {
      return '';
    }
  }
  return formatValue(value, column, opts);
}
