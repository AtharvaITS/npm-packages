import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { sortIndexes, toggleSort } from '../../src/core/sort';
import type { ColumnDef, SortItem } from '../../src/types';

type Row = Record<string, unknown>;

function sorted(rows: Row[], sort: SortItem[], defs?: ColumnDef<Row>[], locale = 'en-US') {
  const cols = resolveColumns(defs, rows);
  const idx = sortIndexes(
    rows,
    rows.map((_, i) => i),
    sort,
    cols,
    locale,
  );
  return idx.map((i) => rows[i]);
}
const pluck = (rows: (Row | undefined)[], key: string) => rows.map((r) => r?.[key]);

describe('sortIndexes', () => {
  it('sorts numbers asc/desc with empty values last in both directions', () => {
    const rows = [{ n: 3 }, { n: null }, { n: 1 }, { n: undefined }, { n: 2 }, { n: Number.NaN }];
    expect(pluck(sorted(rows, [{ columnId: 'n', direction: 'asc' }]), 'n').slice(0, 3)).toEqual([
      1, 2, 3,
    ]);
    expect(pluck(sorted(rows, [{ columnId: 'n', direction: 'desc' }]), 'n').slice(0, 3)).toEqual([
      3, 2, 1,
    ]);
    for (const dir of ['asc', 'desc'] as const) {
      const tail = pluck(sorted(rows, [{ columnId: 'n', direction: dir }]), 'n').slice(3);
      expect(tail.every((v) => v === null || v === undefined || Number.isNaN(v))).toBe(true);
    }
  });

  it('sorts text naturally and language-aware', () => {
    const rows = [
      { t: 'item10' },
      { t: 'item2' },
      { t: 'éclair' },
      { t: 'Banana' },
      { t: 'eclair' },
      { t: 'apple' },
    ];
    expect(pluck(sorted(rows, [{ columnId: 't', direction: 'asc' }]), 't')).toEqual([
      'apple',
      'Banana',
      'éclair',
      'eclair',
      'item2',
      'item10',
    ]);
  });

  it('sorts dates and booleans by type', () => {
    const rows = [
      { d: new Date(2024, 5, 1), b: true },
      { d: new Date(2020, 0, 1), b: false },
      { d: new Date(2022, 0, 1), b: true },
    ];
    expect(
      sorted(rows, [{ columnId: 'd', direction: 'asc' }]).map((r) => (r!.d as Date).getFullYear()),
    ).toEqual([2020, 2022, 2024]);
    expect(pluck(sorted(rows, [{ columnId: 'b', direction: 'asc' }]), 'b')).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('sorts declared date strings as dates', () => {
    const rows = [{ d: '2024-12-01' }, { d: '2023-01-15' }, { d: '2024-02-01' }];
    const out = sorted(rows, [{ columnId: 'd', direction: 'asc' }], [{ field: 'd', type: 'date' }]);
    expect(pluck(out, 'd')).toEqual(['2023-01-15', '2024-02-01', '2024-12-01']);
  });

  it('orders mixed types number < text < empty', () => {
    const rows = [{ v: 'b' }, { v: null }, { v: 5 }, { v: 'a' }, { v: 1 }];
    expect(pluck(sorted(rows, [{ columnId: 'v', direction: 'asc' }]), 'v')).toEqual([
      1,
      5,
      'a',
      'b',
      null,
    ]);
  });

  it('is stable: equal keys keep their original order', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ k: i % 3, i }));
    const out = sorted(rows, [{ columnId: 'k', direction: 'asc' }]);
    for (let j = 1; j < out.length; j++) {
      if (out[j]!.k === out[j - 1]!.k)
        expect(out[j]!.i as number).toBeGreaterThan(out[j - 1]!.i as number);
    }
  });

  it('supports multi-column sort', () => {
    const rows = [
      { dept: 'B', name: 'z' },
      { dept: 'A', name: 'y' },
      { dept: 'B', name: 'a' },
      { dept: 'A', name: 'b' },
    ];
    const out = sorted(rows, [
      { columnId: 'dept', direction: 'asc' },
      { columnId: 'name', direction: 'desc' },
    ]);
    expect(out.map((r) => `${r!.dept}${r!.name}`)).toEqual(['Ay', 'Ab', 'Bz', 'Ba']);
  });

  it('uses a custom compare', () => {
    const order = ['low', 'mid', 'high'];
    const rows = [{ p: 'high' }, { p: 'low' }, { p: 'mid' }];
    const out = sorted(
      rows,
      [{ columnId: 'p', direction: 'asc' }],
      [{ field: 'p', compare: (a, b) => order.indexOf(a as string) - order.indexOf(b as string) }],
    );
    expect(pluck(out, 'p')).toEqual(['low', 'mid', 'high']);
  });

  it('ignores unknown or non-sortable columns and never mutates input', () => {
    const rows = Object.freeze([{ a: 2 }, { a: 1 }]) as unknown as Row[];
    const indexes = Object.freeze([0, 1]) as unknown as number[];
    const cols = resolveColumns([{ field: 'a', sortable: false }], rows);
    expect(sortIndexes(rows, indexes, [{ columnId: 'a', direction: 'asc' }], cols)).toEqual([0, 1]);
    expect(sortIndexes(rows, indexes, [{ columnId: 'zzz', direction: 'asc' }], cols)).toEqual([
      0, 1,
    ]);
  });
});

describe('toggleSort', () => {
  it('cycles asc → desc → none', () => {
    let s = toggleSort([], 'a', false);
    expect(s).toEqual([{ columnId: 'a', direction: 'asc' }]);
    s = toggleSort(s, 'a', false);
    expect(s).toEqual([{ columnId: 'a', direction: 'desc' }]);
    expect(toggleSort(s, 'a', false)).toEqual([]);
  });

  it('replaces the sort on a plain click and appends with additive', () => {
    const base = [{ columnId: 'a', direction: 'asc' as const }];
    expect(toggleSort(base, 'b', false)).toEqual([{ columnId: 'b', direction: 'asc' }]);
    const multi = toggleSort(base, 'b', true);
    expect(multi).toEqual([
      { columnId: 'a', direction: 'asc' },
      { columnId: 'b', direction: 'asc' },
    ]);
    expect(toggleSort(toggleSort(multi, 'b', true), 'b', true)).toEqual(base);
  });
});
