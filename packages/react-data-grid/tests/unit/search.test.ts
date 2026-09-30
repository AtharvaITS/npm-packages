import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { fold, searchIndexes } from '../../src/core/search';

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

  it('searches nested object values', () => {
    const nested: Row[] = [
      { n: 'a', address: { city: 'Oslo' } },
      { n: 'b', address: { city: 'Rome' } },
    ];
    expect(searchIndexes(nested, [0, 1], 'oslo', resolveColumns(undefined, nested))).toEqual([0]);
  });
});
