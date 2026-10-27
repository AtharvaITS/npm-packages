import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import {
  applyColumnState,
  moveColumn,
  neighbourId,
  setColumnHidden,
  setColumnPinned,
  setColumnWidth,
  snapshotState,
  type EffectiveColumn,
} from '../../src/core/columnState';
import type { GridContextValue } from '../../src/state/GridContext';
import { hasColumnMenu } from '../../src/views/table/ColumnMenu';

const rows = [{ name: 'Ada', city: 'London', notes: 'hi', salary: 10 }];
const columns = resolveColumns(
  [
    { field: 'name', pinned: 'start' },
    { field: 'city' },
    { field: 'notes' },
    { field: 'salary', type: 'number', width: 100, minWidth: 80, maxWidth: 200 },
  ],
  rows,
);

const ids = (list: { id: string }[]) => list.map((column) => column.id);

describe('applyColumnState', () => {
  it('orders pinned columns around the unpinned ones and applies default widths', () => {
    const { ordered, visible } = applyColumnState(columns, []);
    expect(ids(ordered)).toEqual(['name', 'city', 'notes', 'salary']);
    expect(ordered[0]).toMatchObject({ pinned: 'start', layoutWidth: 180, fixedWidth: false });
    expect(ordered[3]).toMatchObject({ layoutWidth: 100, fixedWidth: true, align: 'end' });
    expect(ids(visible)).toEqual(ids(ordered));
  });

  it('applies width, order, pin and hidden state, and clamps width', () => {
    const { ordered, visible } = applyColumnState(columns, [
      { id: 'salary', order: 4, pinned: 'end', width: 9999 },
      { id: 'notes', order: 3, hidden: true },
      { id: 'city', order: 2, pinned: null },
      { id: 'unknown', order: 9 },
    ]);
    expect(ids(ordered)).toEqual(['name', 'city', 'notes', 'salary']);
    expect(ordered.find((column) => column.id === 'salary')).toMatchObject({
      pinned: 'end',
      layoutWidth: 200,
      fixedWidth: true,
    });
    expect(ids(visible)).toEqual(['name', 'city', 'salary']);
  });

  it('keeps definition order for columns that have no saved state', () => {
    const { ordered } = applyColumnState(columns, [{ id: 'city', order: 5 }]);
    expect(ids(ordered)).toEqual(['name', 'notes', 'salary', 'city']);
  });

  it('always leaves one column visible', () => {
    const hidden = columns.map((column, index) => ({ id: column.id, order: index + 1, hidden: true }));
    const applied = applyColumnState(columns, hidden);
    expect(applied.visible).toHaveLength(1);
    expect(applied.visible[0]).toMatchObject({ id: 'name', hidden: false });

    const only = resolveColumns([{ field: 'only', hidden: true }], [{ only: 1 }]);
    expect(applyColumnState(only, []).visible.map((column) => column.hidden)).toEqual([false]);
  });

  it('uses a 1-based column number and ignores 0 and negative orders', () => {
    const numbered = resolveColumns(
      [
        { field: 'name' },
        { field: 'city' },
        { field: 'notes' },
        { field: 'salary' },
        { field: 'team' },
        { field: 'extra' },
      ],
      [{ name: 'A', city: 'B', notes: 'C', salary: 1, team: 'D', extra: 'E' }],
    );
    const definition = ['name', 'city', 'notes', 'salary', 'team', 'extra'];

    expect(ids(applyColumnState(numbered, [{ id: 'notes', order: 1 }]).ordered)).toEqual([
      'notes',
      'name',
      'city',
      'salary',
      'team',
      'extra',
    ]);
    expect(ids(applyColumnState(numbered, [{ id: 'name', order: 1 }]).ordered)).toEqual(definition);
    expect(ids(applyColumnState(numbered, [{ id: 'notes', order: 5, hidden: true }]).ordered)).toEqual([
      'name',
      'city',
      'salary',
      'team',
      'notes',
      'extra',
    ]);
    expect(
      applyColumnState(numbered, [{ id: 'notes', order: 5, hidden: true }]).ordered.find(
        (column) => column.id === 'notes',
      )!.hidden,
    ).toBe(true);

    const zero = applyColumnState(numbered, [{ id: 'notes', order: 0, hidden: true }]);
    expect(ids(zero.ordered)).toEqual(definition);
    expect(zero.ordered.find((column) => column.id === 'notes')!.hidden).toBe(true);
    expect(ids(applyColumnState(numbered, [{ id: 'salary', order: -3 }]).ordered)).toEqual(definition);
    expect(ids(applyColumnState(numbered, [{ id: 'extra', order: -1, hidden: true }]).ordered)).toEqual(
      definition,
    );

    const { ordered } = applyColumnState(numbered, [{ id: 'notes', order: 1 }]);
    const snap = snapshotState(ordered, []);
    expect(snap.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids(applyColumnState(numbered, snap).ordered)).toEqual(ids(ordered));
  });

  it('counts order on the visible columns when another column is hidden', () => {
    const employees = resolveColumns(
      [
        { field: 'id', hidden: true },
        { field: 'avatar' },
        { field: 'name', pinned: 'start' },
        { field: 'label' },
        { field: 'department' },
        { field: 'bio' },
      ],
      [{ id: '1', avatar: '', name: 'Ada', label: 'L', department: 'Design', bio: 'Hi' }],
    );
    const { visible } = applyColumnState(employees, [{ id: 'bio', order: 4, hidden: false }]);
    expect(ids(visible)).toEqual(['name', 'avatar', 'label', 'bio', 'department']);
  });

  it('uses an explicit null pin to unpin a column that was pinned by definition', () => {
    const { ordered } = applyColumnState(columns, [{ id: 'name', order: 3, pinned: null }]);
    expect(ordered.find((column) => column.id === 'name')!.pinned).toBeNull();
    expect(ids(ordered)).toEqual(['city', 'notes', 'name', 'salary']);
  });
});

describe('column state edits', () => {
  const { ordered } = applyColumnState(columns, []);

  it('snapshots display order and keeps a previously saved width', () => {
    const snap = snapshotState(ordered, [{ id: 'salary', order: 9, width: 140 }]);
    expect(snap.map((item) => item.id)).toEqual(ids(ordered));
    expect(snap.map((item) => item.order)).toEqual([1, 2, 3, 4]);
    expect(snap.find((item) => item.id === 'salary')!.width).toBe(140);
    expect(snap.find((item) => item.id === 'name')!.width).toBeUndefined();
  });

  it('rounds and clamps a resized width, and ignores an unknown column', () => {
    const state = [{ id: 'name', order: 0 }];
    const widened = setColumnWidth(ordered, state, 'salary', 150.6);
    expect(widened.find((item) => item.id === 'salary')!.width).toBe(151);
    expect(setColumnWidth(ordered, state, 'salary', 10).find((item) => item.id === 'salary')!.width).toBe(
      80,
    );
    const unknown = setColumnWidth(ordered, state, 'missing', 140);
    expect(unknown).toEqual(state);
    expect(unknown).not.toBe(state);
  });

  it('refuses to hide the last visible column and can show a column again', () => {
    const visibleName = applyColumnState(
      resolveColumns([{ field: 'name' }, { field: 'city' }], rows),
      [{ id: 'city', order: 1, hidden: true }],
    ).ordered;
    expect(visibleName.filter((column) => !column.hidden).map((column) => column.id)).toEqual([
      'name',
    ]);
    expect(setColumnHidden(visibleName, [], 'name', true)).toBeNull();
    expect(
      setColumnHidden(visibleName, [], 'city', false)!.find((item) => item.id === 'city')!.hidden,
    ).toBe(false);
  });

  it('pins, unpins and moves columns, including into another pin group', () => {
    const pinned = setColumnPinned(ordered, [], 'city', 'end');
    expect(pinned.find((item) => item.id === 'city')!.pinned).toBe('end');
    expect(setColumnPinned(ordered, pinned, 'city', null).find((item) => item.id === 'city')!.pinned).toBe(
      null,
    );

    const moved = moveColumn(ordered, [], 'city', 'notes');
    expect(ids(moved)).toEqual(['name', 'notes', 'city', 'salary']);

    const further = moveColumn(ordered, [], 'city', 'salary');
    expect(ids(further)).toEqual(['name', 'notes', 'salary', 'city']);
    expect(further.find((item) => item.id === 'city')!.pinned).toBeNull();

    const ontoStart = moveColumn(ordered, [], 'salary', 'name');
    expect(ids(ontoStart)).toEqual(['salary', 'name', 'city', 'notes']);
    expect(ontoStart.find((item) => item.id === 'salary')!.pinned).toBe('start');
  });

  it('does not move a column that cannot be reordered, or onto itself', () => {
    const locked = applyColumnState(
      resolveColumns(
        [
          { field: 'name', reorderable: false },
          { field: 'city' },
        ],
        rows,
      ),
      [],
    ).ordered;
    expect(ids(moveColumn(locked, [], 'name', 'city'))).toEqual(['name', 'city']);
    expect(ids(moveColumn(locked, [], 'city', 'name'))).toEqual(['name', 'city']);
    expect(ids(moveColumn(ordered, [], 'city', 'city'))).toEqual(ids(ordered));
    expect(ids(moveColumn(ordered, [], 'missing', 'city'))).toEqual(ids(ordered));
  });

  it('finds the visible neighbour and skips hidden columns', () => {
    const visible = applyColumnState(columns, [{ id: 'notes', order: 2, hidden: true }]).visible;
    expect(ids(visible)).toEqual(['name', 'city', 'salary']);
    expect(neighbourId(visible, 'city', -1)).toBe('name');
    expect(neighbourId(visible, 'city', 1)).toBe('salary');
    expect(neighbourId(visible, 'name', -1)).toBeUndefined();
    expect(neighbourId(visible, 'salary', 1)).toBeUndefined();
    expect(neighbourId(visible, 'notes', 1)).toBeUndefined();
  });
});

describe('hasColumnMenu', () => {
  const column = (extra: Partial<EffectiveColumn>) =>
    applyColumnState(resolveColumns([{ field: 'name', ...extra }], rows), []).ordered[0]!;
  const ctx = (actions: Partial<GridContextValue['columnActions']>) =>
    ({
      columnActions: {
        canPin: false,
        canReorder: false,
        canHide: false,
        canResize: false,
        setWidth() {},
        setHidden: () => false,
        setPinned() {},
        move() {},
        moveBy() {},
        ...actions,
      },
    }) as GridContextValue;

  it('is available when the column or the grid still offers a column action', () => {
    const inert = column({ sortable: false, reorderable: false, hideable: false });
    expect(hasColumnMenu(inert, ctx({}))).toBe(false);
    expect(hasColumnMenu(inert, ctx({ canPin: true }))).toBe(true);
    expect(hasColumnMenu(column({ sortable: true, reorderable: false, hideable: false }), ctx({}))).toBe(
      true,
    );
    expect(
      hasColumnMenu(column({ sortable: false, reorderable: true, hideable: false }), ctx({ canReorder: true })),
    ).toBe(true);
    expect(
      hasColumnMenu(column({ sortable: false, reorderable: true, hideable: false }), ctx({ canReorder: false })),
    ).toBe(false);
    expect(
      hasColumnMenu(column({ sortable: false, reorderable: false, hideable: true }), ctx({ canHide: true })),
    ).toBe(true);
  });
});
