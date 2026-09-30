import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { filterIndexes, operatorsFor } from '../../src/core/filter';
import type { FilterCondition } from '../../src/types';

type Row = Record<string, unknown>;
const rows: Row[] = [
  {
    name: 'Ada Lovelace',
    dept: 'Eng',
    age: 36,
    active: true,
    start: new Date(2020, 0, 15),
    note: '',
  },
  {
    name: 'Alan Turing',
    dept: 'Eng',
    age: 41,
    active: false,
    start: new Date(2021, 5, 1),
    note: 'x',
  },
  {
    name: 'Grace Hopper',
    dept: 'Ops',
    age: 85,
    active: true,
    start: new Date(2019, 11, 31),
    note: null,
  },
  { name: 'Édith Piaf', dept: 'Art', age: null, active: null, start: null, note: 'y' },
];
const all = rows.map((_, i) => i);
const cols = resolveColumns(
  [
    { field: 'name' },
    { field: 'dept', type: 'enum', enumValues: ['Eng', 'Ops', 'Art'] },
    { field: 'age', type: 'number' },
    { field: 'active', type: 'boolean' },
    { field: 'start', type: 'date' },
    { field: 'note' },
    { field: 'locked', filterable: false },
  ],
  rows,
);
const run = (...conditions: FilterCondition[]) => filterIndexes(rows, all, conditions, cols);

describe('filterIndexes: text', () => {
  it.each<[FilterCondition, number[]]>([
    [{ columnId: 'name', operator: 'contains', value: 'AN' }, [1]],
    [{ columnId: 'name', operator: 'contains', value: 'edith' }, [3]],
    [{ columnId: 'name', operator: 'equals', value: 'ada lovelace' }, [0]],
    [{ columnId: 'name', operator: 'startsWith', value: 'gr' }, [2]],
    [{ columnId: 'name', operator: 'endsWith', value: 'ING' }, [1]],
    [{ columnId: 'note', operator: 'isEmpty' }, [0, 2]],
    [{ columnId: 'note', operator: 'isNotEmpty' }, [1, 3]],
    [{ columnId: 'dept', operator: 'in', value: ['Ops', 'Art'] }, [2, 3]],
  ])('%j', (condition, expected) => {
    expect(run(condition)).toEqual(expected);
  });
});

describe('filterIndexes: number', () => {
  it.each<[FilterCondition, number[]]>([
    [{ columnId: 'age', operator: 'eq', value: 36 }, [0]],
    [{ columnId: 'age', operator: 'neq', value: 36 }, [1, 2]],
    [{ columnId: 'age', operator: 'lt', value: 41 }, [0]],
    [{ columnId: 'age', operator: 'lte', value: 41 }, [0, 1]],
    [{ columnId: 'age', operator: 'gt', value: 41 }, [2]],
    [{ columnId: 'age', operator: 'gte', value: 41 }, [1, 2]],
    [{ columnId: 'age', operator: 'between', value: 36, value2: 41 }, [0, 1]],
    [{ columnId: 'age', operator: 'between', value: 41, value2: 36 }, [0, 1]],
    [{ columnId: 'age', operator: 'isEmpty' }, [3]],
    [{ columnId: 'age', operator: 'isNotEmpty' }, [0, 1, 2]],
  ])('%j', (condition, expected) => {
    expect(run(condition)).toEqual(expected);
  });
});

describe('filterIndexes: date', () => {
  it.each<[FilterCondition, number[]]>([
    [{ columnId: 'start', operator: 'before', value: '2020-01-15' }, [2]],
    [{ columnId: 'start', operator: 'after', value: '2020-01-15' }, [1]],
    [{ columnId: 'start', operator: 'on', value: '2020-01-15' }, [0]],
    [{ columnId: 'start', operator: 'between', value: '2019-12-31', value2: '2020-01-15' }, [0, 2]],
    [
      {
        columnId: 'start',
        operator: 'between',
        value: new Date(2020, 0, 15),
        value2: new Date(2021, 5, 1),
      },
      [0, 1],
    ],
    [{ columnId: 'start', operator: 'isEmpty' }, [3]],
  ])('%j (inclusive)', (condition, expected) => {
    expect(run(condition)).toEqual(expected);
  });
});

describe('filterIndexes: boolean', () => {
  it.each<[FilterCondition, number[]]>([
    [{ columnId: 'active', operator: 'isTrue' }, [0, 2]],
    [{ columnId: 'active', operator: 'isFalse' }, [1]],
    [{ columnId: 'active', operator: 'isEmpty' }, [3]],
  ])('%j', (condition, expected) => {
    expect(run(condition)).toEqual(expected);
  });
});

describe('filterIndexes: combination and invalid conditions', () => {
  it('combines conditions with AND', () => {
    expect(
      run(
        { columnId: 'dept', operator: 'equals', value: 'eng' },
        { columnId: 'active', operator: 'isTrue' },
      ),
    ).toEqual([0]);
  });

  it('ignores unknown columns, non-filterable columns, wrong operators and missing values', () => {
    expect(run({ columnId: 'nope', operator: 'contains', value: 'a' })).toEqual(all);
    expect(run({ columnId: 'locked', operator: 'contains', value: 'a' })).toEqual(all);
    expect(run({ columnId: 'age', operator: 'contains', value: 'a' })).toEqual(all);
    expect(run({ columnId: 'name', operator: 'contains' })).toEqual(all);
    expect(run({ columnId: 'age', operator: 'between', value: 1 })).toEqual(all);
  });
});

describe('operatorsFor', () => {
  it('offers the operators from data model §7', () => {
    expect(operatorsFor('boolean', false)).toEqual(['isTrue', 'isFalse', 'isEmpty']);
    expect(operatorsFor('text', true)[0]).toBe('in');
    expect(operatorsFor('date', false)).toContain('between');
    expect(operatorsFor('currency', false)).toContain('gte');
  });
});
