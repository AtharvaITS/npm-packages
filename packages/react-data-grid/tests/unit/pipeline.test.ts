import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { pageSlice } from '../../src/core/paginate';
import { runPipeline } from '../../src/core/pipeline';
import type { FilterCondition, SortItem } from '../../src/types';

type Row = { name: string; dept: string; age: number | null; note?: string };

const rows: Row[] = [
  { name: 'Ada', dept: 'Eng', age: 36, note: 'secret' },
  { name: 'Alan', dept: 'Eng', age: 41, note: '' },
  { name: 'Grace', dept: 'Ops', age: 85, note: '' },
  { name: 'Edith', dept: 'Eng', age: 50, note: 'sketch' },
  { name: 'Bea', dept: 'Eng', age: null, note: '' },
];

const columns = resolveColumns(
  [
    { field: 'name' },
    { field: 'dept' },
    { field: 'age', type: 'number' },
    { field: 'note', hidden: true },
  ],
  rows,
);

const names = (indexes: number[]) => indexes.map((i) => rows[i]!.name);

describe('runPipeline', () => {
  it('returns every row in order when search, filters and sort are empty', () => {
    const result = runPipeline({ rows, columns, search: '   ', filters: [], sort: [] });
    expect(result.indexes).toEqual([0, 1, 2, 3, 4]);
    expect(result.matchCount).toBe(5);
  });

  it('searches, filters and sorts the same rows without mutating them', () => {
    const snapshot = rows.map((row) => ({ ...row }));
    const filters: FilterCondition[] = [{ columnId: 'age', operator: 'gte', value: 40 }];
    const sort: SortItem[] = [{ columnId: 'age', direction: 'desc' }];
    const result = runPipeline({
      rows,
      columns,
      search: 'eng',
      filters,
      sort,
      locale: 'en-US',
    });
    expect(names(result.indexes)).toEqual(['Edith', 'Alan']);
    expect(result.matchCount).toBe(2);
    expect(rows).toEqual(snapshot);
    expect(filters).toEqual([{ columnId: 'age', operator: 'gte', value: 40 }]);
    expect(pageSlice(result.indexes, 0, 1)).toEqual([result.indexes[0]]);
  });

  it('limits search to the columns the caller marks searchable', () => {
    const visible = columns.filter((column) => !column.hidden);
    const note = columns.find((column) => column.id === 'note')!;
    expect(
      runPipeline({ rows, columns, searchColumns: visible, search: 'secret', filters: [], sort: [] })
        .indexes,
    ).toEqual([]);
    expect(
      runPipeline({
        rows,
        columns,
        searchColumns: [{ ...note, hidden: false }],
        search: 'secret',
        filters: [],
        sort: [],
      }).indexes,
    ).toEqual([0]);
  });

  it('ignores an unknown sort column and keeps the filtered order', () => {
    const result = runPipeline({
      rows,
      columns,
      search: '',
      filters: [{ columnId: 'dept', operator: 'equals', value: 'eng' }],
      sort: [{ columnId: 'missing', direction: 'asc' }],
    });
    expect(names(result.indexes)).toEqual(['Ada', 'Alan', 'Edith', 'Bea']);
  });
});
