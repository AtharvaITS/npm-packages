import { describe, expect, it } from 'vitest';
import {
  applyColumnState,
  moveRowGroup,
  placeRowGroup,
  setColumnRowGroup,
  snapshotState,
} from '../../src/core/columnState';
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

  it('leaves the given indexes in place when no column is grouped', () => {
    const indexes = [3, 1, 0];
    const result = grouped(people, [{ field: 'name' }], {
      indexes,
      sort: [{ columnId: 'name', direction: 'asc' }],
    });
    expect(result.items).toEqual([
      { kind: 'data', index: 3, depth: 0 },
      { kind: 'data', index: 1, depth: 0 },
      { kind: 'data', index: 0, depth: 0 },
    ]);
    expect(result.visibleLeafIndexes).toEqual([3, 1, 0]);
    expect(indexes).toEqual([3, 1, 0]);
  });

  it('uses column order when grouped columns share a level', () => {
    const result = grouped(people, [
      { field: 'department', rowGroup: true, rowGroupIndex: 0 },
      { field: 'country', rowGroup: true, rowGroupIndex: 0 },
    ]);
    expect(
      result.items.flatMap((item) => (item.kind === 'group' && item.depth === 0 ? [item.columnId] : [])),
    ).toEqual(['department', 'department']);
  });

  it('sorts a non-sortable group column and keeps the blank group last', () => {
    const rows = [
      { country: 'USA', name: 'John' },
      { country: null, name: 'Blank' },
      { country: 'India', name: 'Priya' },
    ];
    const defs: ColumnDef<Row>[] = [{ field: 'country', rowGroup: true, sortable: false }];
    const ascending = grouped(rows, defs);
    expect(shownText(rows, ascending.items, defs)).toEqual(['India', 'Priya', 'USA', 'John', '(Blank)', 'Blank']);

    const descending = grouped(rows, defs, { sort: [{ columnId: 'country', direction: 'desc' }] });
    expect(shownText(rows, descending.items, defs)).toEqual(['USA', 'John', 'India', 'Priya', '(Blank)', 'Blank']);
  });

  it('keeps the full leaf count while a collapsed group hides its rows', () => {
    const result = grouped(people, [{ field: 'country', rowGroup: true }], { collapsed: ['country=s:USA'] });
    const usa = result.items.find((item) => item.kind === 'group' && item.key === 'country=s:USA');
    expect(usa && usa.kind === 'group' && usa.expanded).toBe(false);
    expect(usa && usa.kind === 'group' && usa.count).toBe(3);
    expect(result.visibleLeafIndexes.map((index) => people[index]!.name)).toEqual(['Priya']);
  });

  it('groups currency, percent, bigint, dates, and arrays by value', () => {
    const rows = [
      { amount: 10, rate: 0.1, qty: 2n, tags: ['a', 'b'], n: 0, when: new Date(Number.NaN), odd: Number.NaN },
      { amount: '10', rate: '0.1', qty: 2n, tags: ['a', 'b'], n: -0, when: null, odd: Number.POSITIVE_INFINITY },
      { amount: 11, rate: 0.2, qty: 3n, tags: ['b', 'a'], n: 1, when: 'not-a-date', odd: null },
    ];
    const counts = (field: string, type?: ColumnDef<Row>['type']) =>
      grouped(rows, [{ field, type, rowGroup: true }]).items
        .filter((item) => item.kind === 'group')
        .map((item) => (item.kind === 'group' ? item.count : 0));

    expect(counts('amount', 'currency')).toEqual([2, 1]);
    expect(counts('rate', 'percent')).toEqual([2, 1]);
    expect(counts('qty')).toEqual([2, 1]);
    expect(counts('tags')).toEqual([2, 1]);
    expect(counts('n', 'number')).toEqual([2, 1]);
    expect(counts('when', 'date')).toEqual([3]);
    expect(counts('odd', 'number')).toEqual([3]);

    const blank = [{ v: Symbol('a') }, { v: () => 1 }, { v: null }];
    expect(grouped(blank, [{ field: 'v', rowGroup: true }]).items.filter((item) => item.kind === 'group')).toHaveLength(1);
  });

  it('uses format for the label only', () => {
    const defs: ColumnDef<Row>[] = [
      {
        field: 'country',
        rowGroup: true,
        format: (value) => (value == null || value === '' ? '' : `Region ${value}`),
      },
    ];
    const result = grouped(people, defs);
    expect(shownText(people, result.items, defs)).toEqual([
      'Region India',
      'Priya',
      'Region USA',
      'John',
      'David',
      'Sarah',
    ]);
    const column = resolveColumns(defs, people)[0]!;
    expect(formatGroupValue('USA', column, people[0], { messages: defaultMessages }, '(Blank)')).toBe('Region USA');
    expect(formatGroupValue(null, column, undefined, { messages: defaultMessages }, '(Blank)')).toBe('(Blank)');

    const throwing = resolveColumns<Row>(
      [{ field: 'country', format: () => { throw new Error('bad format'); } }],
      people,
    )[0]!;
    expect(formatGroupValue('USA', throwing, people[0], { messages: defaultMessages }, '(Blank)')).toBe('(Blank)');
  });

  it('appends, inserts, and refuses grouping changes that do not apply', () => {
    const rows = [{ country: 'USA', department: 'Sales', name: 'Ada' }];
    const defs: ColumnDef<Row>[] = [
      { field: 'country', rowGroup: true, rowGroupIndex: 0 },
      { field: 'department', rowGroup: true, rowGroupIndex: 1 },
      { field: 'name' },
      { field: 'locked', groupable: false },
    ];
    const columns = resolveColumns(defs, rows);
    const { ordered } = applyColumnState(columns, []);
    const idsOf = (state: ReturnType<typeof setColumnRowGroup>) =>
      resolveGroupColumns(applyColumnState(columns, state).ordered).map((column) => column.id);

    const appended = setColumnRowGroup(ordered, [], 'name', true);
    expect(idsOf(appended)).toEqual(['country', 'department', 'name']);
    expect(appended.find((item) => item.id === 'name')).toMatchObject({ rowGroup: true, rowGroupIndex: 2 });

    const inserted = placeRowGroup(ordered, appended, 'name', 'department');
    expect(idsOf(inserted)).toEqual(['country', 'name', 'department']);

    const removed = setColumnRowGroup(applyColumnState(columns, inserted).ordered, inserted, 'department', false);
    expect(idsOf(removed)).toEqual(['country', 'name']);
    expect(removed.find((item) => item.id === 'name')?.rowGroupIndex).toBe(1);
    expect(removed.find((item) => item.id === 'department')).toMatchObject({ rowGroup: false });
    expect(removed.find((item) => item.id === 'department')).not.toHaveProperty('rowGroupIndex');

    expect(placeRowGroup(ordered, appended, 'locked', null)).toEqual(appended);
    expect(placeRowGroup(ordered, appended, 'name', 'name')).toEqual(appended);
    expect(placeRowGroup(ordered, appended, 'missing', null)).toEqual(appended);
    expect(setColumnRowGroup(ordered, appended, 'missing', false)).toEqual(appended);
    expect(idsOf(moveRowGroup(ordered, [], 'country', -1))).toEqual(['country', 'department']);
    expect(idsOf(moveRowGroup(ordered, [], 'department', 1))).toEqual(['country', 'department']);
    expect(idsOf(moveRowGroup(ordered, [], 'name', 1))).toEqual(['country', 'department']);
  });

  it('lets saved column state override the column definition', () => {
    const rows = [{ country: 'USA', department: 'Sales' }];
    const columns = resolveColumns<Row>(
      [
        { field: 'country', rowGroup: true, rowGroupIndex: 0 },
        { field: 'department' },
      ],
      rows,
    );
    const overridden = applyColumnState(columns, [
      { id: 'country', order: 1, rowGroup: false, rowGroupIndex: 3 },
      { id: 'department', order: 2, rowGroup: true, rowGroupIndex: 4 },
    ]);
    expect(resolveGroupColumns(overridden.ordered).map((column) => column.id)).toEqual(['department']);
    expect(overridden.ordered.find((column) => column.id === 'department')?.rowGroupIndex).toBe(4);
    expect(overridden.ordered.find((column) => column.id === 'country')?.rowGroup).toBe(false);

    const fromDefinition = applyColumnState(columns, [{ id: 'country', order: 1, width: 140 }]);
    expect(resolveGroupColumns(fromDefinition.ordered).map((column) => column.id)).toEqual(['country']);
    expect(snapshotState(fromDefinition.ordered, [{ id: 'country', order: 1, width: 140 }])).toEqual([
      expect.objectContaining({ id: 'country', order: 1, width: 140, rowGroup: true, rowGroupIndex: 0 }),
      expect.objectContaining({ id: 'department', order: 2, rowGroup: false }),
    ]);
    expect(snapshotState(fromDefinition.ordered, [])[1]).not.toHaveProperty('rowGroupIndex');
  });
});
