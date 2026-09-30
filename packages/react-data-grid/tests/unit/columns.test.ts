import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveColumns, humanizeHeader, inferType, resolveColumns } from '../../src/core/columns';

describe('humanizeHeader', () => {
  it.each([
    ['firstName', 'First Name'],
    ['snake_case', 'Snake Case'],
    ['address.city', 'Address City'],
    ['kebab-case-key', 'Kebab Case Key'],
    ['XMLHttpRequest', 'XML Http Request'],
    ['id', 'Id'],
    ['key with spaces', 'Key With Spaces'],
    ['名前', '名前'],
  ])('%s → %s', (input, expected) => {
    expect(humanizeHeader(input)).toBe(expected);
  });
});

describe('deriveColumns', () => {
  it('returns the union of keys in first-seen order', () => {
    expect(deriveColumns([{ a: 1, b: 2 }, { c: 3, a: 4 }, { d: 5 }])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('supports 120 fields', () => {
    const row: Record<string, number> = {};
    for (let i = 0; i < 120; i++) row['f' + i] = i;
    expect(deriveColumns([row])).toHaveLength(120);
  });
});

describe('inferType', () => {
  it('infers numbers, booleans and dates', () => {
    expect(inferType([1, 2, null, 3])).toBe('number');
    expect(inferType([true, false, undefined])).toBe('boolean');
    expect(inferType([new Date(), new Date()])).toBe('date');
  });

  it('never infers strings as numbers or dates', () => {
    expect(inferType(['42', '7'])).toBe('text');
    expect(inferType(['2026-01-05'])).toBe('text');
  });

  it('infers image URLs and data URIs as image', () => {
    expect(inferType(['https://x.test/a.png', 'data:image/svg+xml,abc'])).toBe('image');
  });

  it('falls back to text for mixed or empty values', () => {
    expect(inferType([1, 'a'])).toBe('text');
    expect(inferType([null, undefined, ''])).toBe('text');
  });
});

describe('resolveColumns', () => {
  afterEach(() => vi.restoreAllMocks());

  it('derives columns with defaults for zero-config data', () => {
    const cols = resolveColumns(undefined, [{ firstName: 'Ada', age: 36, active: true }]);
    expect(cols.map((c) => [c.id, c.header, c.type, c.align])).toEqual([
      ['firstName', 'First Name', 'text', 'start'],
      ['age', 'Age', 'number', 'end'],
      ['active', 'Active', 'boolean', 'start'],
    ]);
    expect(cols[0]).toMatchObject({
      minWidth: 60,
      maxWidth: 800,
      sortable: true,
      filterable: true,
      hideable: true,
    });
  });

  it('handles inconsistent keys across rows', () => {
    const cols = resolveColumns(undefined, [{ a: 1 }, { b: 'x' }]);
    expect(cols.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('renames duplicate ids with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cols = resolveColumns([{ field: 'a' }, { field: 'a' }], [], {});
    expect(cols.map((c) => c.id)).toEqual(['a', 'a__2']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate column id "a"'));
  });

  it('skips columns without field or id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cols = resolveColumns([{ header: 'Nothing' }, { field: 'x' }], [], {});
    expect(cols.map((c) => c.id)).toEqual(['x']);
    expect(warn).toHaveBeenCalled();
  });

  it('clamps width between min and max', () => {
    const [c] = resolveColumns([{ field: 'a', width: 2000, minWidth: 50, maxWidth: 300 }], []);
    expect(c!.width).toBe(300);
    const [d] = resolveColumns([{ field: 'a', width: 10, minWidth: 50 }], []);
    expect(d!.width).toBe(50);
  });

  it('auto-collects enum values only for ≤ 20 repeating distinct values', () => {
    const twenty = Array.from({ length: 60 }, (_, i) => ({ v: 'v' + (i % 20) }));
    const twentyOne = Array.from({ length: 63 }, (_, i) => ({ v: 'v' + (i % 21) }));
    expect(resolveColumns(undefined, twenty)[0]!.enumValues).toHaveLength(20);
    expect(resolveColumns(undefined, twentyOne)[0]!.enumValues).toBeUndefined();
  });

  it('keeps an explicit type and makes image columns unsearchable by default', () => {
    const [img, txt] = resolveColumns(
      [
        { field: 'pic', type: 'image' },
        { field: 'n', type: 'number' },
      ],
      [{ pic: 'x', n: '4' }],
    );
    expect(img!.searchable).toBe(false);
    expect(txt!.type).toBe('number');
  });
});
