import { describe, expect, it, vi } from 'vitest';
import { resolveColumns, type ResolvedColumn } from '../../src/core/columns';
import { applyColumnState, type EffectiveColumn } from '../../src/core/columnState';
import { canEditColumn, editorModel, parseEditedValue } from '../../src/core/editValue';
import { isCellEditing, openCellEditor } from '../../src/views/CellEditor';
import type { ColumnDef } from '../../src/types';

function effective(def: ColumnDef): EffectiveColumn {
  const resolved = resolveColumns([def], [{ value: null, name: 'Ada', qty: 1, start: '2024-01-05' }]);
  return applyColumnState(resolved, []).ordered[0]!;
}

describe('canEditColumn', () => {
  it('allows field columns and valueSetter columns, and blocks custom renderers', () => {
    expect(canEditColumn({ field: 'name' })).toBe(true);
    expect(canEditColumn({ field: 'name', valueGetter: () => 'x', valueSetter: (row: unknown) => row })).toBe(
      true,
    );
    expect(canEditColumn({ valueSetter: (row: unknown) => row })).toBe(true);
    expect(canEditColumn({ field: 'name', valueGetter: () => 'x' })).toBe(false);
    expect(canEditColumn({ field: 'name', render: () => null })).toBe(false);
    expect(canEditColumn({ field: 'name', render: () => null, valueSetter: (row: unknown) => row })).toBe(
      false,
    );
    expect(canEditColumn({ field: '' })).toBe(false);
    expect(canEditColumn({})).toBe(false);
  });
});

describe('editorModel', () => {
  it('picks an editor for booleans, enums, numbers, dates and text', () => {
    expect(editorModel(effective({ field: 'active', type: 'boolean' }), true).checked).toBe(true);
    expect(editorModel(effective({ field: 'active', type: 'boolean' }), false)).toMatchObject({
      kind: 'boolean',
      checked: false,
    });
    expect(editorModel(effective({ field: 'active', type: 'boolean' }), 'yes').checked).toBe(false);

    const color = effective({ field: 'color', type: 'enum', enumValues: ['Red', 'Blue'] });
    expect(editorModel(color, 'Blue')).toEqual({
      kind: 'enum',
      text: 'Blue',
      checked: false,
      options: ['Red', 'Blue'],
    });
    expect(editorModel(effective({ field: 'color', type: 'enum' }), 'Blue').kind).toBe('text');

    expect(editorModel(effective({ field: 'qty', type: 'percent' }), 0.25).text).toBe('0.25');
    expect(editorModel(effective({ field: 'qty', type: 'number' }), Number.NaN).text).toBe('NaN');
    expect(editorModel(effective({ field: 'qty', type: 'currency' }), null)).toMatchObject({
      kind: 'number',
      text: '',
    });

    expect(editorModel(effective({ field: 'start', type: 'date' }), new Date(2024, 0, 5)).text).toBe(
      '2024-01-05',
    );
    expect(editorModel(effective({ field: 'start', type: 'date' }), new Date('nope')).text).toBe('');
    expect(editorModel(effective({ field: 'start', type: 'date' }), ' 2024-03-04 ').text).toBe(
      '2024-03-04',
    );
    expect(editorModel(effective({ field: 'start', type: 'date' }), 'March 4').kind).toBe('text');
    expect(editorModel(effective({ field: 'name' }), { city: 'Oslo' }, '{city}').text).toBe('{city}');
    expect(editorModel(effective({ field: 'name' }), null).text).toBe('');
  });
});

describe('parseEditedValue', () => {
  const column = (type: ResolvedColumn['type'], extra: ColumnDef = {}) =>
    effective({ field: 'value', type, ...extra });

  it('parses booleans, numbers and calendar dates, and rejects invalid drafts', () => {
    expect(parseEditedValue(column('boolean'), false, true)).toEqual({ ok: true, value: true });
    expect(parseEditedValue(column('boolean'), true, 'true')).toEqual({ ok: true, value: false });
    expect(parseEditedValue(column('number'), 1, ' 12.5 ')).toEqual({ ok: true, value: 12.5 });
    expect(parseEditedValue(column('currency'), 1, '   ')).toEqual({ ok: true, value: null });
    expect(parseEditedValue(column('percent'), 1, 'abc').ok).toBe(false);
    expect(parseEditedValue(column('number'), 1, 'Infinity').ok).toBe(false);

    const parsed = parseEditedValue(column('date'), new Date(2020, 0, 1), '2024-01-05');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toBeInstanceOf(Date);
      expect((parsed.value as Date).getFullYear()).toBe(2024);
      expect((parsed.value as Date).getMonth()).toBe(0);
      expect((parsed.value as Date).getDate()).toBe(5);
    }
    expect(parseEditedValue(column('date'), '2024-01-05', '2024-06-01')).toEqual({
      ok: true,
      value: '2024-06-01',
    });
    expect(parseEditedValue(column('date'), new Date(), '')).toEqual({ ok: true, value: null });
    expect(parseEditedValue(column('date'), new Date(), '2024-02-31').ok).toBe(false);
    expect(parseEditedValue(column('date'), new Date(), '2024-13-01').ok).toBe(false);
    expect(parseEditedValue(column('date'), 'not-a-date', 'tomorrow')).toEqual({
      ok: true,
      value: 'tomorrow',
    });
  });

  it('keeps enum option types and returns text for free-form columns', () => {
    const status = column('enum', { enumValues: [1, 2] });
    expect(parseEditedValue(status, 1, '2')).toEqual({ ok: true, value: 2 });
    expect(parseEditedValue(status, 1, '9')).toEqual({ ok: true, value: '9' });
    expect(parseEditedValue(column('text'), 'a', 'Ada')).toEqual({ ok: true, value: 'Ada' });
    expect(parseEditedValue(column('image'), 'a', false)).toEqual({ ok: true, value: 'false' });
  });
});

describe('cell editor helpers', () => {
  it('matches the open editor to one cell', () => {
    expect(isCellEditing(null, '1', 'name')).toBe(false);
    expect(isCellEditing({ rowId: '1', columnId: 'name' }, '1', 'city')).toBe(false);
    expect(isCellEditing({ rowId: '1', columnId: 'name' }, undefined, 'name')).toBe(false);
    expect(isCellEditing({ rowId: '1', columnId: 'name' }, '1', 'name')).toBe(true);
  });

  it('opens an editor without letting the click activate the row', () => {
    const event = { stopPropagation: vi.fn() };
    const startEdit = vi.fn();
    openCellEditor(event, startEdit, 2, 'name');
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(startEdit).toHaveBeenCalledWith(2, 'name');
  });
});
