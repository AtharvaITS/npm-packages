import { describe, expectTypeOf, it } from 'vitest';
import {
  createColumns,
  type ReactDataGridProps,
  type CellContext,
  type ColumnDef,
  type DataRequest,
  type FetchDataOptions,
  type RowId,
} from '../../src';

type Employee = { id: string; name: string; salary: number; address: { city: string } };

describe('public API types', () => {
  it('createColumns infers the row type in valueGetter and render', () => {
    createColumns<Employee>([
      {
        id: 'label',
        valueGetter: (row) => {
          expectTypeOf(row).toEqualTypeOf<Employee>();
          return row.name.toUpperCase();
        },
        render: (ctx) => {
          expectTypeOf(ctx).toEqualTypeOf<CellContext<Employee>>();
          expectTypeOf(ctx.row.address.city).toBeString();
          return null;
        },
      },
    ]);
    expectTypeOf(createColumns<Employee>([])).toEqualTypeOf<ColumnDef<Employee>[]>();
  });

  it('getRowId accepts a key, a path string or a function', () => {
    expectTypeOf<{ getRowId: 'id' }>().toMatchTypeOf<
      Pick<ReactDataGridProps<Employee>, 'getRowId'>
    >();
    expectTypeOf<{ getRowId: 'address.city' }>().toMatchTypeOf<
      Pick<ReactDataGridProps<Employee>, 'getRowId'>
    >();
    expectTypeOf<{ getRowId: (row: Employee, index: number) => string }>().toMatchTypeOf<
      Pick<ReactDataGridProps<Employee>, 'getRowId'>
    >();
  });

  it('onSelectionChange receives typed rows', () => {
    type Handler = NonNullable<ReactDataGridProps<Employee>['onSelectionChange']>;
    expectTypeOf<Parameters<Handler>[0]>().toEqualTypeOf<RowId[]>();
    expectTypeOf<Parameters<Handler>[1]>().toEqualTypeOf<Employee[]>();
  });

  it('fetchData has the documented signature', () => {
    type Fetch = NonNullable<ReactDataGridProps<Employee>['fetchData']>;
    expectTypeOf<Parameters<Fetch>>().toEqualTypeOf<[DataRequest, FetchDataOptions]>();
    expectTypeOf<Awaited<ReturnType<Fetch>>['rows']>().toEqualTypeOf<Employee[]>();
  });

  it('accepts sum aggregation on a column', () => {
    const columns: ColumnDef<Employee>[] = [{ field: 'salary', type: 'number', aggregate: 'sum' }];
    expectTypeOf(columns[0]!.aggregate).toEqualTypeOf<'sum' | undefined>();
    // @ts-expect-error only "sum" is a supported aggregate
    const bad: ColumnDef<Employee> = { field: 'salary', aggregate: 'avg' };
    void bad;
  });

  it('rejects unknown props and invalid values', () => {
    // @ts-expect-error unknown prop
    const bad: ReactDataGridProps<Employee> = { data: [], notAProp: true };
    // @ts-expect-error invalid view
    const badView: ReactDataGridProps<Employee> = { view: 'kanban' };
    // @ts-expect-error invalid selection mode
    const badMode: ReactDataGridProps<Employee> = { selectionMode: 'many' };
    void bad;
    void badView;
    void badMode;
  });
});
