import { afterEach, describe, expect, it, vi } from 'vitest';
import { getValue, normalizeData, resolveRowIds } from '../../src/core/normalize';

describe('normalizeData', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([null, undefined])('treats %s as an empty data set without warning', (input) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeData(input, {}).rows).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([{ a: 1 }, 'text', 42, true])(
    'treats non-array %s as empty with one dev warning',
    (input) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const key = {};
      expect(normalizeData(input, key).rows).toEqual([]);
      normalizeData(input, key);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toMatch(/^\[ReactDataGrid\] data must be an array/);
    },
  );

  it('drops non-record items and reports their indexes once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = Object.freeze([{ id: 1 }, null, 42, 'str', [1, 2], { id: 2 }, undefined]);
    const result = normalizeData(input, {});
    expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.sourceIndexes).toEqual([0, 5]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('Skipped 5 invalid rows at indexes 1, 2, 3, 4, 6');
  });

  it('never mutates the supplied array or rows', () => {
    const rows = Object.freeze([Object.freeze({ a: 1 }), Object.freeze({ a: 2 })]);
    expect(() => normalizeData(rows, {})).not.toThrow();
    expect(normalizeData(rows, {}).rows[0]).toBe(rows[0]);
  });
});

describe('getValue', () => {
  const row = {
    name: 'Ada',
    address: { city: 'London', geo: { lat: 51 } },
    'a.b': 'literal',
    empty: null,
  };

  it('reads top-level and nested paths', () => {
    expect(getValue(row, 'name')).toBe('Ada');
    expect(getValue(row, 'address.city')).toBe('London');
    expect(getValue(row, 'address.geo.lat')).toBe(51);
  });

  it('prefers a literal key containing dots', () => {
    expect(getValue(row, 'a.b')).toBe('literal');
  });

  it('is safe on missing segments and non-objects', () => {
    expect(getValue(row, 'address.zip.code')).toBeUndefined();
    expect(getValue(row, 'empty.x')).toBeUndefined();
    expect(getValue(null, 'x')).toBeUndefined();
    expect(getValue(row, 'missing')).toBeUndefined();
  });
});

describe('resolveRowIds', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the source index when no getRowId is given', () => {
    const rows = [{ a: 1 }, { a: 2 }];
    expect(resolveRowIds(rows, [0, 3], undefined)).toEqual(['0', '3']);
  });

  it('reads ids from a field path or a function', () => {
    const rows = [
      { id: 'x', n: { k: 1 } },
      { id: 'y', n: { k: 2 } },
    ];
    expect(resolveRowIds(rows, [0, 1], 'id')).toEqual(['x', 'y']);
    expect(resolveRowIds(rows, [0, 1], 'n.k')).toEqual(['1', '2']);
    expect(resolveRowIds(rows, [0, 1], (r) => r.id.toUpperCase())).toEqual(['X', 'Y']);
  });

  it('falls back to index ids for the whole set on duplicates, warning once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'a' }];
    const key = {};
    expect(resolveRowIds(rows, [0, 1, 2], 'id', key)).toEqual(['0', '1', '2']);
    resolveRowIds(rows, [0, 1, 2], 'id', key);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('duplicate ids: a');
  });

  it('falls back to index ids when some ids are missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = [{ id: 'a' }, { other: 1 }];
    expect(resolveRowIds(rows, [0, 1], 'id', {})).toEqual(['0', '1']);
    expect(warn.mock.calls[0]![0]).toContain('1 rows have no id');
  });
});
