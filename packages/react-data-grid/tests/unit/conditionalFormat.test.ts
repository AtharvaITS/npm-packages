import { describe, expect, it } from 'vitest';
import {
  compareOperator,
  draftToRule,
  emptyDraft,
  formatToStyle,
  resolveCellFormat,
  resolveRowFormat,
  validateFormatRule,
  type FormatColumn,
} from '../../src/conditional/evaluate';
import type { ConditionalFormatRule, FormatOperator } from '../../src/types';

const columns: FormatColumn[] = [
  { id: 'status', field: 'status', header: 'Status', type: 'text' },
  { id: 'amount', field: 'amount', header: 'Amount', type: 'number' },
  { id: 'country', field: 'country', header: 'Country', type: 'text' },
  { id: 'start', field: 'start', header: 'Start', type: 'date' },
  { id: 'active', field: 'active', header: 'Active', type: 'boolean' },
  {
    id: 'label',
    header: 'Label',
    type: 'text',
    valueGetter: (row: { status: string; amount: number }) => `${row.status}-${row.amount}`,
  },
];

const ada = { status: 'Active', amount: 15000, country: 'India', start: '2020-01-15', active: true };
const bea = { status: 'Paused', amount: 50, country: '', start: '2024-06-01', active: false };

function rule(
  partial: Partial<ConditionalFormatRule> & Pick<ConditionalFormatRule, 'operator' | 'columnId'>,
): ConditionalFormatRule {
  return {
    id: partial.id ?? partial.operator + partial.columnId,
    scope: partial.scope ?? 'cell',
    style: partial.style ?? { backgroundColor: '#ff0000' },
    value: partial.value,
    value2: partial.value2,
    columnId: partial.columnId,
    operator: partial.operator,
  };
}

function paints(row: typeof ada, operator: FormatOperator, value?: string, value2?: string, columnId = 'status') {
  const matched = resolveCellFormat(
    [rule({ operator, columnId, value, value2, scope: 'cell' })],
    row,
    columns,
    columnId,
  );
  return matched?.backgroundColor === '#ff0000';
}

describe('conditional formatting operators', () => {
  it('matches equal, not equal, contains, and the text edges', () => {
    expect(paints(ada, 'equal', 'active')).toBe(true);
    expect(paints(bea, 'equal', 'Active')).toBe(false);
    expect(paints(ada, 'notEqual', 'Active')).toBe(false);
    expect(paints(bea, 'notEqual', 'Active')).toBe(true);
    expect(paints(ada, 'contains', 'cti')).toBe(true);
    expect(paints(bea, 'contains', 'cti')).toBe(false);
    expect(paints(ada, 'notContains', 'zzz')).toBe(true);
    expect(paints(ada, 'notContains', 'act')).toBe(false);
    expect(paints(ada, 'startsWith', 'act')).toBe(true);
    expect(paints(bea, 'startsWith', 'act')).toBe(false);
    expect(paints(ada, 'endsWith', 'ive')).toBe(true);
    expect(paints(bea, 'endsWith', 'ive')).toBe(false);
  });

  it('treats blank values as empty and keeps zero and false', () => {
    expect(paints(bea, 'isEmpty', undefined, undefined, 'country')).toBe(true);
    expect(paints(ada, 'isEmpty', undefined, undefined, 'country')).toBe(false);
    expect(paints(ada, 'isNotEmpty', undefined, undefined, 'country')).toBe(true);
    expect(paints(bea, 'isNotEmpty', undefined, undefined, 'country')).toBe(false);
    expect(compareOperator('isEmpty', 0, '', '', false)).toBe(false);
    expect(compareOperator('isEmpty', false, '', '', false)).toBe(false);
    expect(compareOperator('isEmpty', '   ', '', '', false)).toBe(true);
    expect(compareOperator('isEmpty', Number.NaN, '', '', false)).toBe(true);
  });

  it('compares numbers, including between in either order', () => {
    expect(paints(ada, 'gt', '10000', undefined, 'amount')).toBe(true);
    expect(paints(bea, 'gt', '10000', undefined, 'amount')).toBe(false);
    expect(paints(ada, 'gte', '15000', undefined, 'amount')).toBe(true);
    expect(paints(bea, 'lt', '100', undefined, 'amount')).toBe(true);
    expect(paints(ada, 'lt', '100', undefined, 'amount')).toBe(false);
    expect(paints(bea, 'lte', '50', undefined, 'amount')).toBe(true);
    expect(paints(ada, 'lte', '50', undefined, 'amount')).toBe(false);
    expect(paints(ada, 'between', '1000', '20000', 'amount')).toBe(true);
    expect(paints(bea, 'between', '20000', '1000', 'amount')).toBe(false);
    expect(paints(bea, 'notBetween', '1000', '20000', 'amount')).toBe(true);
    expect(paints(ada, 'notBetween', '1000', '20000', 'amount')).toBe(false);
    expect(paints(ada, 'equal', '15000', undefined, 'amount')).toBe(true);
    expect(paints(ada, 'equal', '15000.0', undefined, 'amount')).toBe(true);
    expect(compareOperator('gt', 'abc', '1', '', false)).toBe(false);
    expect(compareOperator('lt', 'abc', '1', '', false)).toBe(false);
  });

  it('compares dates by calendar day', () => {
    expect(paints(ada, 'gt', '2019-01-01', undefined, 'start')).toBe(true);
    expect(paints(bea, 'lt', '2020-01-01', undefined, 'start')).toBe(false);
    expect(paints(ada, 'between', '2020-01-01', '2020-12-31', 'start')).toBe(true);
    expect(paints(bea, 'between', '2020-01-01', '2020-12-31', 'start')).toBe(false);
    expect(compareOperator('gt', 'not-a-date', '2020-01-01', '', true)).toBe(false);
  });

  it('matches booleans and value getters', () => {
    expect(paints(ada, 'equal', 'yes', undefined, 'active')).toBe(true);
    expect(paints(bea, 'equal', 'no', undefined, 'active')).toBe(true);
    expect(paints(ada, 'contains', 'Active-15000', undefined, 'label')).toBe(true);
  });

  it('applies row scope to every cell and lets a cell rule override it', () => {
    const rules = [
      rule({
        id: 'row',
        operator: 'gt',
        columnId: 'amount',
        value: '10000',
        scope: 'row',
        style: { backgroundColor: '#ffff00', fontWeight: '700' },
      }),
      rule({
        id: 'cell',
        operator: 'equal',
        columnId: 'status',
        value: 'Active',
        scope: 'cell',
        style: { backgroundColor: '#00ff00', textColor: '#ffffff' },
      }),
    ];
    expect(resolveCellFormat(rules, ada, columns, 'status')).toMatchObject({
      backgroundColor: '#00ff00',
      textColor: '#ffffff',
      fontWeight: '700',
    });
    expect(resolveCellFormat(rules, ada, columns, 'amount')).toMatchObject({
      backgroundColor: '#ffff00',
      fontWeight: '700',
    });
    expect(resolveCellFormat(rules, bea, columns, 'status')).toBeUndefined();
    expect(resolveRowFormat(rules, ada, columns)?.backgroundColor).toBe('#ffff00');
    expect(resolveRowFormat(rules, bea, columns)).toBeUndefined();
  });

  it('lets a later rule override an earlier one on the same property', () => {
    const rules = [
      rule({ id: '1', operator: 'equal', columnId: 'status', value: 'Active', style: { backgroundColor: '#111111' } }),
      rule({ id: '2', operator: 'equal', columnId: 'status', value: 'Active', style: { backgroundColor: '#222222' } }),
    ];
    expect(resolveCellFormat(rules, ada, columns, 'status')?.backgroundColor).toBe('#222222');
  });

  it('builds a style and skips unset font choices', () => {
    expect(
      formatToStyle({ backgroundColor: '#ff0000', textColor: '#ffffff', fontWeight: '700', fontStyle: 'italic' }),
    ).toMatchObject({
      backgroundColor: '#ff0000',
      color: '#ffffff',
      fontWeight: '700',
      fontStyle: 'italic',
    });
    expect(formatToStyle({ fontWeight: 'default', fontStyle: 'default' })).toBeUndefined();
  });
});

describe('conditional formatting validation', () => {
  it('rejects an incomplete rule and accepts a complete one', () => {
    expect(validateFormatRule(emptyDraft(), 'text')).toBe('column');
    expect(validateFormatRule({ ...emptyDraft(), columnId: 'status' }, 'text')).toBe('operator');
    expect(
      validateFormatRule({ ...emptyDraft(), columnId: 'status', operator: 'equal' }, 'text'),
    ).toBe('value');
    expect(
      validateFormatRule({ ...emptyDraft(), columnId: 'amount', operator: 'between', value: '1' }, 'number'),
    ).toBe('range');
    expect(
      validateFormatRule(
        { ...emptyDraft(), columnId: 'amount', operator: 'gt', value: 'abc' },
        'number',
      ),
    ).toBe('number');
    expect(
      validateFormatRule({ ...emptyDraft(), columnId: 'start', operator: 'lt', value: 'soon' }, 'date'),
    ).toBe('date');
    expect(
      validateFormatRule({ ...emptyDraft(), columnId: 'country', operator: 'isEmpty' }, 'text'),
    ).toBeNull();
    expect(
      validateFormatRule({ ...emptyDraft(), columnId: 'country', operator: 'isNotEmpty' }, 'text'),
    ).toBeNull();

    const saved = draftToRule(
      {
        ...emptyDraft(),
        columnId: 'amount',
        operator: 'between',
        value: ' 10 ',
        value2: ' 20 ',
        scope: 'row',
        backgroundColor: '#fff3bf',
        fontWeight: '600',
        fontStyle: 'italic',
      },
      'rule-1',
      'number',
    );
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.rule.value).toBe('10');
      expect(saved.rule.value2).toBe('20');
      expect(saved.rule.scope).toBe('row');
      expect(saved.rule.style.fontWeight).toBe('600');
    }
  });
});
