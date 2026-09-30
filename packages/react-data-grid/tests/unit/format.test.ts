import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedColumn } from '../../src/core/columns';
import { formatValue, toDate } from '../../src/core/format';

const col = (type: ResolvedColumn['type'], extra: Partial<ResolvedColumn> = {}) =>
  ({ id: 'c', type, ...extra }) as ResolvedColumn;
const en = { locale: 'en-US' };

describe('formatValue (data model §4.2)', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([null, undefined, ''])('empty value %s → empty string', (v) => {
    expect(formatValue(v, col('text'), en)).toBe('');
  });

  it('formats finite numbers with the locale', () => {
    expect(formatValue(1234567.5, col('number'), en)).toBe('1,234,567.5');
    expect(formatValue(1234567.5, col('number'), { locale: 'de-DE' })).toBe('1.234.567,5');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('%s → em dash', (v) => {
    expect(formatValue(v, col('number'), en)).toBe('—');
  });

  it('formats bigint', () => {
    expect(formatValue(BigInt('9007199254740993'), col('text'), en)).toBe('9,007,199,254,740,993');
  });

  it('formats booleans with messages', () => {
    expect(formatValue(true, col('boolean'), en)).toBe('Yes');
    expect(formatValue(false, col('boolean'), { ...en, messages: { yes: 'Oui', no: 'Non' } })).toBe(
      'Non',
    );
  });

  it('formats valid and invalid dates', () => {
    expect(formatValue(new Date(2026, 0, 5), col('date'), en)).toBe('Jan 5, 2026');
    expect(formatValue(new Date('nope'), col('date'), en)).toBe('—');
  });

  it('formats date strings only when the column is declared as date', () => {
    expect(formatValue('2026-01-05', col('date'), en)).toBe('Jan 5, 2026');
    expect(formatValue('2026-01-05', col('text'), en)).toBe('2026-01-05');
  });

  it('formats currency and percent', () => {
    expect(formatValue(1234, col('currency', { formatOptions: { currency: 'USD' } }), en)).toBe(
      '$1,234.00',
    );
    expect(formatValue(0.125, col('percent'), en)).toBe('12.5%');
    expect(formatValue('99', col('currency'), en)).toBe('$99.00');
  });

  it('summarizes arrays: first 3 items + count', () => {
    expect(formatValue(['a', 'b', 'c', 'd', 'e'], col('text'), en)).toBe('a, b, c +2');
    expect(formatValue([1, 2], col('text'), en)).toBe('1, 2');
  });

  it('summarizes plain objects by keys', () => {
    expect(formatValue({ city: 'Oslo', zip: '0150', country: 'NO' }, col('text'), en)).toBe(
      '{city, zip, +1}',
    );
    expect(formatValue({}, col('text'), en)).toBe('{}');
  });

  it('shows [Circular] for circular structures', () => {
    const a: Record<string, unknown> = { name: 'loop' };
    a.self = a;
    expect(formatValue(a, col('text'), en)).toBe('[Circular]');
  });

  it('returns function and symbol values as empty with one warning per column', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const key = {};
    expect(formatValue(() => 1, col('text'), { ...en, warnKey: key })).toBe('');
    expect(formatValue(Symbol('s'), col('text'), { ...en, warnKey: key })).toBe('');
    expect(formatValue(() => 2, col('text'), { ...en, warnKey: key })).toBe('');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('returns markup strings unchanged (rendered as text by the view)', () => {
    expect(formatValue('<b>bold</b> & <script>', col('text'), en)).toBe('<b>bold</b> & <script>');
  });

  it('survives an invalid locale', () => {
    expect(formatValue(5, col('number'), { locale: 'not a locale!!' })).toBe('5');
  });
});

describe('toDate', () => {
  it('parses date-only strings as local calendar dates', () => {
    const d = toDate('2026-03-04')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 4]);
  });
  it('returns undefined for invalid input', () => {
    expect(toDate('garbage')).toBeUndefined();
    expect(toDate({})).toBeUndefined();
  });
});
