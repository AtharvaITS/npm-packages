import { describe, expect, it } from 'vitest';
import {
  addAggregateTotals,
  addRowToTotals,
  addRowsToTotals,
  aggregateColumns,
  createAggregateTotals,
  finalizeAggregateTotals,
  formatAggregateValue,
} from '../../src/core/aggregate';
import { resolveColumns, type ResolvedColumn } from '../../src/core/columns';

type Row = Record<string, unknown>;

function columns(defs: Parameters<typeof resolveColumns<Row>>[0], rows: Row[] = []) {
  return resolveColumns(defs, rows);
}

describe('aggregation', () => {
  const rows: Row[] = [
    { department: 'Sales', salary: 40000, bonus: 1000, rate: 0.1, price: 10 },
    { department: 'Sales', salary: 50000, bonus: 500, rate: 0.2, price: 20.5 },
  ];

  it('keeps sum only on number, currency, and percent columns', () => {
    const resolved = columns(
      [
        { field: 'salary', type: 'number', aggregate: 'sum', hidden: true },
        { field: 'price', type: 'currency', aggregate: 'sum' },
        { field: 'rate', type: 'percent', aggregate: 'sum' },
        { field: 'department', type: 'text', aggregate: 'sum' },
        { field: 'bonus', type: 'number' },
      ],
      rows,
    );
    expect(aggregateColumns(resolved).map((column) => column.id)).toEqual(['salary', 'price', 'rate']);
    expect(resolved.find((column) => column.id === 'department')?.aggregate).toBeUndefined();
  });

  it('infers a numeric column and sums its valueGetter', () => {
    const resolved = columns(
      [
        { field: 'salary', aggregate: 'sum' },
        { id: 'extra', type: 'number', aggregate: 'sum', valueGetter: (row) => row.bonus },
      ],
      rows,
    );
    const totals = createAggregateTotals(aggregateColumns(resolved));
    expect(totals).toEqual({ salary: 0, extra: 0 });
    addRowsToTotals(totals, rows, [0, 1], aggregateColumns(resolved));
    expect(finalizeAggregateTotals(totals)).toEqual({ salary: 90000, extra: 1500 });
  });

  it('skips null, blank, and non-finite values without changing the row', () => {
    const [salary] = columns([{ field: 'salary', type: 'number', aggregate: 'sum' }]);
    const row = Object.freeze({ salary: 4, note: 'keep' });
    const kept = { salary: 0 };
    addRowToTotals(kept, row, [salary!]);
    expect(kept).toEqual({ salary: 4 });
    expect(row).toEqual({ salary: 4, note: 'keep' });

    const cases: unknown[] = [
      null,
      undefined,
      '',
      '   ',
      'nope',
      'Infinity',
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      false,
      { n: 1 },
      ['4'],
    ];
    for (const salaryValue of cases) {
      const totals = { salary: 1 };
      addRowToTotals(totals, { salary: salaryValue }, [salary!]);
      expect(totals).toEqual({ salary: 1 });
    }
  });

  it('sums numbers, numeric strings, and bigint, including negatives', () => {
    const [salary] = columns([{ field: 'salary', type: 'number', aggregate: 'sum' }]);
    const totals = createAggregateTotals([salary!]);
    addRowToTotals(totals, { salary: 10 }, [salary!]);
    addRowToTotals(totals, { salary: -2.5 }, [salary!]);
    addRowToTotals(totals, { salary: '5.5' }, [salary!]);
    addRowToTotals(totals, { salary: 2n }, [salary!]);
    expect(finalizeAggregateTotals(totals)).toEqual({ salary: 15 });
  });

  it('sums only the given row indexes and skips a missing index', () => {
    const summing = aggregateColumns(
      columns([
        { field: 'salary', type: 'number', aggregate: 'sum' },
        { field: 'bonus', type: 'number', aggregate: 'sum' },
      ]),
    );
    const totals = createAggregateTotals(summing);
    addRowsToTotals(totals, rows, [1, 9], summing);
    expect(totals).toEqual({ salary: 50000, bonus: 500 });
  });

  it('adds child totals into a parent without double-counting', () => {
    const parent = createAggregateTotals([{ id: 'salary' }, { id: 'bonus' }]);
    addAggregateTotals(parent, { salary: 40000, bonus: 1000 });
    addAggregateTotals(parent, { salary: 50000, bonus: 0 });
    expect(parent).toEqual({ salary: 90000, bonus: 1000 });
  });

  it('removes binary float noise and negative zero', () => {
    const noisy = { salary: 0.1 + 0.2, bonus: -0, rate: Number.POSITIVE_INFINITY };
    const totals = finalizeAggregateTotals(noisy);
    expect(totals).toEqual({ salary: 0.3, bonus: 0, rate: 0 });
    expect(Object.is(totals.bonus, -0)).toBe(false);
    expect(noisy.salary).not.toBe(0.3);
  });

  it('ignores a column that is not aggregated', () => {
    const [salary] = columns([{ field: 'salary', type: 'number' }]);
    const totals = { salary: 0 };
    addRowToTotals(totals, { salary: 10 }, [salary!]);
    expect(totals).toEqual({ salary: 0 });
  });

  it('formats currency, percent, locale numbers, and a custom format', () => {
    const [price, rate, salary, bonus] = columns([
      { field: 'price', type: 'currency', aggregate: 'sum', formatOptions: { currency: 'USD' } },
      { field: 'rate', type: 'percent', aggregate: 'sum' },
      {
        field: 'salary',
        type: 'number',
        aggregate: 'sum',
        format: (value) => `total ${value}`,
      },
      { field: 'bonus', type: 'number', aggregate: 'sum' },
    ]) as [ResolvedColumn<Row>, ResolvedColumn<Row>, ResolvedColumn<Row>, ResolvedColumn<Row>];
    const opts = { locale: 'en-US' };
    expect(formatAggregateValue(30.5, price, opts)).toBe('$30.50');
    expect(formatAggregateValue(0.3, rate, opts)).toBe('30%');
    expect(formatAggregateValue(90000, salary, opts)).toBe('total 90000');
    expect(formatAggregateValue(1234.5, bonus, { locale: 'de-DE' })).toBe('1.234,5');
  });

  it('uses column formatting when format throws or returns nothing', () => {
    const [throwing, empty] = columns([
      {
        field: 'salary',
        type: 'number',
        aggregate: 'sum',
        format: () => {
          throw new Error('needs a row');
        },
      },
      {
        field: 'bonus',
        type: 'number',
        aggregate: 'sum',
        format: () => undefined as unknown as string,
      },
    ]) as [ResolvedColumn<Row>, ResolvedColumn<Row>];
    expect(formatAggregateValue(1500, throwing, { locale: 'en-US' })).toBe('1,500');
    expect(formatAggregateValue(1500, empty, { locale: 'en-US' })).toBe('1,500');
  });
});
