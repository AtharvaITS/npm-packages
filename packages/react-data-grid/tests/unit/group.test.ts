import { describe, expect, it } from 'vitest';
import { applyColumnState, moveRowGroup, setColumnRowGroup } from '../../src/core/columnState';
import { resolveColumns } from '../../src/core/columns';
import {
  buildGroupedItems,
  formatGroupValue,
  groupValueToken,
  resolveGroupColumns,
} from '../../src/core/group';
import { defaultMessages } from '../../src/i18n/messages';
import type { ColumnDef } from '../../src/types';

type Row = Record<string, unknown>;

function grouped(
  rows: Row[],
  defs: ColumnDef<Row>[],
  options?: {
    indexes?: number[];
    sort?: { columnId: string; direction: 'asc' | 'desc' }[];
    collapsed?: string[];
  },
) {
  const columns = resolveColumns(defs, rows);
  const indexes = options?.indexes ?? rows.map((_, index) => index);
  return buildGroupedItems({
    rows,
    indexes,
    groupColumns: resolveGroupColumns(columns),
    sort: options?.sort ?? [],
    columns,
    locale: 'en-US',
    collapsed: new Set(options?.collapsed ?? []),
  });
}

function shownText(rows: Row[], items: ReturnType<typeof grouped>['items'], defs: ColumnDef<Row>[]) {
  const columns = resolveColumns(defs, rows);
  return items.map((item) => {
    if (item.kind === 'data') return String(rows[item.index]?.name ?? '');
    const column = columns.find((candidate) => candidate.id === item.columnId);
    if (!column) return '';
    const sample = item.sampleIndex >= 0 ? rows[item.sampleIndex] : undefined;
    return formatGroupValue(
      item.value,
      column,
      sample,
      { locale: 'en-US', messages: defaultMessages },
      defaultMessages.blankGroup,
    );
  });
}

describe('row grouping', () => {
  const people = [
    { country: 'USA', department: 'Sales', name: 'John', active: true, score: 2 },
    { country: 'India', department: 'Sales', name: 'Priya', active: true, score: 1 },
    { country: 'USA', department: 'Support', name: 'David', active: false, score: 2 },
    { country: 'USA', department: 'Sales', name: 'Sarah', active: true, score: 1.5 },
  ];

  it('groups by one column and keeps each record in a single group', () => {
    const defs: ColumnDef<Row>[] = [{ field: 'country', rowGroup: true }];
    const result = grouped(people, defs);
    expect(result.visibleLeafIndexes).toHaveLength(people.length);
    expect(new Set(result.visibleLeafIndexes).size).toBe(people.length);
    expect(shownText(people, result.items, defs)).toEqual([
      'India',
      'Priya',
      'USA',
      'John',
      'David',
      'Sarah',
    ]);
    const usa = result.items.find((item) => item.kind === 'group' && item.key === 'country=s:USA');
    expect(usa && usa.kind === 'group' && usa.count).toBe(3);
  });

  it('builds a hierarchy in rowGroupIndex order', () => {
    const defs: ColumnDef<Row>[] = [
      { field: 'department', rowGroup: true, rowGroupIndex: 1 },
      { field: 'country', rowGroup: true, rowGroupIndex: 0 },
      { field: 'name' },
    ];
    const result = grouped(people, defs);
    const groups = result.items.filter((item) => item.kind === 'group');
    expect(groups.map((item) => (item.kind === 'group' ? item.key : ''))).toEqual([
      'country=s:India',
      'country=s:India\u001fdepartment=s:Sales',
      'country=s:USA',
      'country=s:USA\u001fdepartment=s:Sales',
      'country=s:USA\u001fdepartment=s:Support',
    ]);
    expect(groups.map((item) => (item.kind === 'group' ? item.depth : -1))).toEqual([0, 1, 0, 1, 1]);
  });

  it('follows grouping order when rowGroupIndex is swapped', () => {
    const defs: ColumnDef<Row>[] = [
      { field: 'country', rowGroup: true, rowGroupIndex: 1 },
      { field: 'department', rowGroup: true, rowGroupIndex: 0 },
    ];
    const result = grouped(people, defs);
    expect(
      result.items.filter((item) => item.kind === 'group').map((item) => (item.kind === 'group' ? item.key : '')),
    ).toEqual([
      'department=s:Sales',
      'department=s:Sales\u001fcountry=s:India',
      'department=s:Sales\u001fcountry=s:USA',
      'department=s:Support',
      'department=s:Support\u001fcountry=s:USA',
    ]);
  });

  it('hides descendants when a group is collapsed and restores the child state', () => {
    const defs: ColumnDef<Row>[] = [
      { field: 'country', rowGroup: true, rowGroupIndex: 0 },
      { field: 'department', rowGroup: true, rowGroupIndex: 1 },
    ];
    const sales = 'country=s:USA\u001fdepartment=s:Sales';
    const usa = 'country=s:USA';
    const childCollapsed = grouped(people, defs, { collapsed: [sales] });
    expect(childCollapsed.items.some((item) => item.kind === 'group' && item.key === sales && !item.expanded)).toBe(true);
    expect(childCollapsed.visibleLeafIndexes.map((index) => people[index]!.name)).toEqual(['Priya', 'David']);

    const parentCollapsed = grouped(people, defs, { collapsed: [usa, sales] });
    expect(parentCollapsed.items.some((item) => item.kind === 'group' && item.key === sales)).toBe(false);
    expect(parentCollapsed.visibleLeafIndexes.map((index) => people[index]!.name)).toEqual(['Priya']);

    const restored = grouped(people, defs, { collapsed: [sales] });
    expect(restored.visibleLeafIndexes.map((index) => people[index]!.name)).toEqual(['Priya', 'David']);
  });

  it('sorts groups with the column sort and sorts records inside the group', () => {
    const defs: ColumnDef<Row>[] = [
      { field: 'country', rowGroup: true },
      { field: 'name' },
    ];
    const result = grouped(people, defs, {
      sort: [
        { columnId: 'country', direction: 'desc' },
        { columnId: 'name', direction: 'asc' },
      ],
    });
    expect(shownText(people, result.items, defs)).toEqual([
      'USA',
      'David',
      'John',
      'Sarah',
      'India',
      'Priya',
    ]);
  });

  it('groups only the indexes that remain after filtering', () => {
    const defs: ColumnDef<Row>[] = [{ field: 'country', rowGroup: true }];
    const active = people.map((row, index) => (row.active ? index : -1)).filter((index) => index >= 0);
    const result = grouped(people, defs, { indexes: active });
    expect(result.visibleLeafIndexes).toEqual(expect.arrayContaining(active));
    expect(result.visibleLeafIndexes).toHaveLength(active.length);
    const usa = result.items.find((item) => item.kind === 'group' && item.key === 'country=s:USA');
    expect(usa && usa.kind === 'group' && usa.count).toBe(2);
  });

  it('puts null, undefined, and empty values in one blank group', () => {
    const rows = [{ country: 'USA' }, { country: null }, { country: undefined }, { country: '' }];
    const defs: ColumnDef<Row>[] = [{ field: 'country', rowGroup: true }];
    const result = grouped(rows, defs);
    const groups = result.items.filter((item) => item.kind === 'group');
    expect(groups).toHaveLength(2);
    const blank = groups.find((item) => item.kind === 'group' && item.key === 'country=empty');
    expect(blank && blank.kind === 'group' && blank.count).toBe(3);
    expect(groups[0] && groups[0].kind === 'group' && groups[0].key).toBe('country=s:USA');
    expect(groups[1] && groups[1].kind === 'group' && groups[1].key).toBe('country=empty');
    const column = resolveColumns(defs, rows)[0]!;
    expect(formatGroupValue(null, column, undefined, { messages: defaultMessages }, '(Blank)')).toBe('(Blank)');
  });

  it('groups numbers, booleans, dates, and enums by value rather than text', () => {
    const rows = [
      { n: 1, flag: true, when: '2020-01-02', level: 'Gold' },
      { n: 1.0, flag: false, when: new Date(2020, 0, 2), level: 'Silver' },
      { n: 1.5, flag: true, when: '2020-01-03', level: 'Gold' },
      { n: 2, flag: false, when: '2020-01-03', level: 'Gold' },
    ];
    const numberGroups = grouped(rows, [{ field: 'n', type: 'number', rowGroup: true }]);
    expect(numberGroups.items.filter((item) => item.kind === 'group').map((item) => item.kind === 'group' && item.count)).toEqual([
      2, 1, 1,
    ]);

    const boolGroups = grouped(rows, [{ field: 'flag', type: 'boolean', rowGroup: true }]);
    expect(boolGroups.items.filter((item) => item.kind === 'group')).toHaveLength(2);

    const dateGroups = grouped(rows, [{ field: 'when', type: 'date', rowGroup: true }]);
    const dateCounts = dateGroups.items.filter((item) => item.kind === 'group').map((item) => item.kind === 'group' && item.count);
    expect(dateCounts).toEqual([2, 2]);

    const enumGroups = grouped(rows, [{ field: 'level', type: 'enum', rowGroup: true }]);
    const gold = enumGroups.items.find((item) => item.kind === 'group' && item.key === 'level=s:Gold');
    expect(gold && gold.kind === 'group' && gold.count).toBe(3);
  });

  it('groups equal objects by structure and does not throw on cycles', () => {
    const rows = [
      { meta: { city: 'Paris', code: 1 } },
      { meta: { code: 1, city: 'Paris' } },
      { meta: { city: 'Lyon', code: 1 } },
    ];
    const result = grouped(rows, [{ field: 'meta', rowGroup: true }]);
    const groups = result.items.filter((item) => item.kind === 'group');
    expect(groups.map((item) => (item.kind === 'group' ? item.count : 0))).toEqual([2, 1]);

    const cycle: Row = { meta: { name: 'a' } };
    (cycle.meta as Row).self = cycle.meta;
    expect(() => grouped([cycle, { meta: { name: 'b' } }], [{ field: 'meta', rowGroup: true }])).not.toThrow();
  });

  it('uses valueGetter for the group key', () => {
    const rows = [{ id: '1', country: 'USA' }, { id: '2', country: 'USA' }, { id: '3', country: 'India' }];
    const result = grouped(rows, [
      { id: 'region', rowGroup: true, valueGetter: (row) => row.country },
    ]);
    expect(result.items.some((item) => item.kind === 'group' && item.key === 'region=s:USA' && item.count === 2)).toBe(true);
  });

  it('distinguishes the same text at different levels', () => {
    const country = resolveColumns<Row>([{ field: 'country' }], []);
    expect(groupValueToken('Sales', country[0]!)).toBe('s:Sales');
    const rows = [{ country: 'Sales', department: 'Sales' }];
    const result = grouped(rows, [
      { field: 'country', rowGroup: true, rowGroupIndex: 0 },
      { field: 'department', rowGroup: true, rowGroupIndex: 1 },
    ]);
    const keys = result.items.filter((item) => item.kind === 'group').map((item) => (item.kind === 'group' ? item.key : ''));
    expect(keys).toEqual(['country=s:Sales', 'country=s:Sales\u001fdepartment=s:Sales']);
  });

  it('updates grouping order through column state and can remove it', () => {
    const rows = [{ country: 'USA', department: 'Sales' }];
    const columns = resolveColumns(
      [
        { field: 'country', rowGroup: true, rowGroupIndex: 0 },
        { field: 'department', rowGroup: true, rowGroupIndex: 1 },
        { field: 'name' },
      ],
      rows,
    );
    const { ordered } = applyColumnState(columns, []);
    const moved = moveRowGroup(ordered, [], 'department', -1);
    expect(resolveGroupColumns(applyColumnState(columns, moved).ordered).map((column) => column.id)).toEqual([
      'department',
      'country',
    ]);
    const removed = setColumnRowGroup(applyColumnState(columns, moved).ordered, moved, 'department', false);
    expect(resolveGroupColumns(applyColumnState(columns, removed).ordered).map((column) => column.id)).toEqual([
      'country',
    ]);
    const cleared = setColumnRowGroup(applyColumnState(columns, removed).ordered, removed, 'country', false);
    expect(resolveGroupColumns(applyColumnState(columns, cleared).ordered)).toEqual([]);
  });

  it('sums numeric columns for each group and its parents', () => {
    const rows = [
      { department: 'Sales', team: 'East', salary: 40000, bonus: 1000 },
      { department: 'Sales', team: 'West', salary: 50000, bonus: 1500 },
      { department: 'IT', team: 'East', salary: 60000, bonus: null },
      { department: 'IT', team: 'East', salary: 70000, bonus: undefined },
    ];
    const defs: ColumnDef<Row>[] = [
      { field: 'department', rowGroup: true, rowGroupIndex: 0 },
      { field: 'team', rowGroup: true, rowGroupIndex: 1 },
      { field: 'salary', type: 'number', aggregate: 'sum' },
      { field: 'bonus', type: 'number', aggregate: 'sum' },
    ];
    const before = JSON.stringify(rows);
    const result = grouped(rows, defs);
    expect(JSON.stringify(rows)).toBe(before);

    const totals = (key: string) => {
      const item = result.items.find((candidate) => candidate.kind === 'group' && candidate.key === key);
      return item && item.kind === 'group' ? item.aggregates : undefined;
    };
    expect(totals('department=s:Sales')).toEqual({ salary: 90000, bonus: 2500 });
    expect(totals('department=s:Sales\u001fteam=s:East')).toEqual({ salary: 40000, bonus: 1000 });
    expect(totals('department=s:Sales\u001fteam=s:West')).toEqual({ salary: 50000, bonus: 1500 });
    expect(totals('department=s:IT')).toEqual({ salary: 130000, bonus: 0 });
    expect(totals('department=s:IT\u001fteam=s:East')).toEqual({ salary: 130000, bonus: 0 });
  });

  it('keeps the full sum when a group is collapsed, filtered, or sorted', () => {
    const rows = [
      { department: 'Sales', name: 'John', salary: 10.1, active: true },
      { department: 'Sales', name: 'Sarah', salary: 20.2, active: true },
      { department: 'IT', name: 'David', salary: 5, active: false },
    ];
    const defs: ColumnDef<Row>[] = [
      { field: 'department', rowGroup: true },
      { field: 'name' },
      { field: 'salary', aggregate: 'sum' },
    ];
    const collapsed = grouped(rows, defs, { collapsed: ['department=s:Sales'] });
    const sales = collapsed.items.find((item) => item.kind === 'group' && item.key === 'department=s:Sales');
    expect(sales && sales.kind === 'group' && sales.aggregates).toEqual({ salary: 30.3 });
    expect(collapsed.items.some((item) => item.kind === 'data' && rows[item.index]?.name === 'John')).toBe(false);

    const active = rows.map((row, index) => (row.active ? index : -1)).filter((index) => index >= 0);
    const filtered = grouped(rows, defs, { indexes: active });
    const filteredSales = filtered.items.find((item) => item.kind === 'group' && item.key === 'department=s:Sales');
    expect(filteredSales && filteredSales.kind === 'group' && filteredSales.aggregates).toEqual({ salary: 30.3 });
    expect(filtered.items.some((item) => item.kind === 'group' && item.key === 'department=s:IT')).toBe(false);

    const sorted = grouped(rows, defs, { sort: [{ columnId: 'salary', direction: 'desc' }] });
    const sortedSales = sorted.items.find((item) => item.kind === 'group' && item.key === 'department=s:Sales');
    expect(sortedSales && sortedSales.kind === 'group' && sortedSales.aggregates).toEqual({ salary: 30.3 });
  });

  it('skips null, missing, and invalid numbers and does not throw', () => {
    const rows = [
      { department: 'Sales', salary: 10 },
      { department: 'Sales', salary: null },
      { department: 'Sales', salary: undefined },
      { department: 'Sales', salary: '' },
      { department: 'Sales', salary: 'nope' },
      { department: 'Sales', salary: Number.NaN },
      { department: 'Sales', salary: Number.POSITIVE_INFINITY },
      { department: 'Sales', salary: '5.5' },
      { department: 'Sales', salary: 4.5 },
    ];
    const defs: ColumnDef<Row>[] = [
      { field: 'department', rowGroup: true },
      { field: 'salary', type: 'number', aggregate: 'sum' },
    ];
    Object.freeze(rows);
    for (const row of rows) Object.freeze(row);
    const result = grouped(rows, defs);
    const sales = result.items.find((item) => item.kind === 'group' && item.key === 'department=s:Sales');
    expect(sales && sales.kind === 'group' && sales.aggregates).toEqual({ salary: 20 });
  });

  it('sums a valueGetter and leaves groups unchanged when aggregation is off', () => {
    const rows = [
      { department: 'Sales', pay: 1 },
      { department: 'Sales', pay: 2 },
    ];
    const summed = grouped(rows, [
      { field: 'department', rowGroup: true },
      { id: 'pay', type: 'number', aggregate: 'sum', valueGetter: (row) => row.pay },
    ]);
    const sales = summed.items.find((item) => item.kind === 'group' && item.key === 'department=s:Sales');
    expect(sales && sales.kind === 'group' && sales.aggregates).toEqual({ pay: 3 });

    const plain = grouped(rows, [{ field: 'department', rowGroup: true }, { field: 'pay', type: 'number' }]);
    expect(
      plain.items.every((item) => item.kind !== 'group' || item.aggregates === undefined),
    ).toBe(true);
  });
});
