import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { buildSearchText, fold, rawText, searchIndexes } from '../../src/core/search';

type Row = Record<string, unknown>;
const rows: Row[] = [
  { name: 'José Álvarez', city: 'Madrid', salary: 85000, hiddenNote: 'secret' },
  { name: 'Anna Smith', city: 'London', salary: 72000, hiddenNote: 'jose' },
  { name: 'Wei Zhang', city: 'Shanghai', salary: 91000, hiddenNote: '' },
];
const all = rows.map((_, i) => i);

describe('fold', () => {
  it('removes accents and case', () => {
    expect(fold('José ÁLVAREZ')).toBe('jose alvarez');
  });
});

describe('searchIndexes', () => {
  const cols = resolveColumns(undefined, rows);

  it('matches case- and accent-insensitively', () => {
    expect(searchIndexes(rows, all, 'jose', cols)).toEqual([0, 1]);
    expect(searchIndexes(rows, all, 'ÁLVAREZ', cols)).toEqual([0]);
  });

  it('only searches visible, searchable columns', () => {
    const limited = resolveColumns(
      [
        { field: 'name' },
        { field: 'city' },
        { field: 'hiddenNote', hidden: true },
        { field: 'salary', searchable: false },
      ],
      rows,
    );
    expect(searchIndexes(rows, all, 'jose', limited)).toEqual([0]);
    expect(searchIndexes(rows, all, '85000', limited)).toEqual([]);
  });

  it('uses raw values, not formatted ones', () => {
    expect(searchIndexes(rows, all, '85000', cols)).toEqual([0]);
    expect(searchIndexes(rows, all, '85,000', cols)).toEqual([]);
  });

  it('returns everything for an empty or whitespace query', () => {
    expect(searchIndexes(rows, all, '   ', cols)).toEqual(all);
  });

  it('returns no rows when every column is hidden or not searchable', () => {
    const hidden = resolveColumns([{ field: 'name', hidden: true }], rows);
    expect(searchIndexes(rows, all, 'jose', hidden)).toEqual([]);
  });

  it('searches nested object values', () => {
    const nested: Row[] = [
      { n: 'a', address: { city: 'Oslo' } },
      { n: 'b', address: { city: 'Rome' } },
    ];
    expect(searchIndexes(nested, [0, 1], 'oslo', resolveColumns(undefined, nested))).toEqual([0]);
  });
});

describe('rawText', () => {
  it('stringifies primitives and skips values that cannot be searched', () => {
    expect(rawText(null)).toBe('');
    expect(rawText(undefined)).toBe('');
    expect(rawText('Ada')).toBe('Ada');
    expect(rawText(12)).toBe('12');
    expect(rawText(Number.NaN)).toBe('');
    expect(rawText(Number.POSITIVE_INFINITY)).toBe('');
    expect(rawText(true)).toBe('true');
    expect(rawText(3n)).toBe('3');
    expect(rawText(() => 1)).toBe('');
    expect(rawText(Symbol('s'))).toBe('');
    expect(rawText(new Date(Date.UTC(2024, 0, 2)))).toBe('2024-01-02');
    expect(rawText(new Date('not-a-date'))).toBe('');
  });

  it('walks arrays and objects until the depth limit, and survives throwing getters', () => {
    expect(rawText(['Ada', 2, null])).toBe('Ada 2 ');
    expect(rawText({ a: { b: { c: 'deep' } } })).toContain('deep');
    expect(rawText({ a: { b: { c: { d: 'too-deep' } } } })).not.toContain('too-deep');
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    expect(rawText(circular)).toContain('loop');
    const bad = {};
    Object.defineProperty(bad, 'secret', {
      enumerable: true,
      get() {
        throw new Error('nope');
      },
    });
    expect(rawText(bad)).toBe('');
  });
});

describe('buildSearchText', () => {
  it('caches folded text per row until the column key changes', () => {
    const row = { name: 'Ada' };
    const cols = resolveColumns([{ field: 'name' }], [row]);
    expect(buildSearchText(row, cols, 'name')).toBe('ada');
    row.name = 'Grace';
    expect(buildSearchText(row, cols, 'name')).toBe('ada');
    expect(buildSearchText(row, cols, 'name-2')).toBe('grace');
  });
});
