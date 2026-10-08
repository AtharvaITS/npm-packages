import { describe, expect, it, vi } from 'vitest';
import type { EffectiveColumn } from '../../src/core/columnState';
import { applyRowDrafts, withFieldValue } from '../../src/core/editValue';

function column(partial: Partial<EffectiveColumn> & { id: string }): EffectiveColumn {
  return partial as EffectiveColumn;
}

describe('row edit drafts', () => {
  it('replaces a nested field without mutating the original row', () => {
    const row = { id: '1', name: 'Sarah', address: { city: 'London', country: 'UK' } };
    const next = withFieldValue(row, 'address.city', 'Paris');
    expect(next).toEqual({ id: '1', name: 'Sarah', address: { city: 'Paris', country: 'UK' } });
    expect(row.address).toEqual({ city: 'London', country: 'UK' });
    expect(next.address).not.toBe(row.address);
  });

  it('prefers a literal dotted key over a nested path', () => {
    const row = { 'address.city': 'London', address: { city: 'Paris' } };
    expect(withFieldValue(row, 'address.city', 'Berlin')).toEqual({
      'address.city': 'Berlin',
      address: { city: 'Paris' },
    });
    expect(row['address.city']).toBe('London');
  });

  it('rejects an invalid number and leaves the row unchanged', () => {
    const row = { id: '1', qty: 2 };
    const result = applyRowDrafts(
      row,
      [column({ id: 'qty', field: 'qty', type: 'number' })],
      { qty: 'abc' },
      { qty: '2' },
    );
    expect(result).toEqual({ ok: false, errors: { qty: true } });
    expect(row.qty).toBe(2);
  });

  it('writes only the fields that changed', () => {
    const setter = vi.fn();
    const row = { id: '1', name: 'Sarah', label: 'Sarah (UK)' };
    const result = applyRowDrafts(
      row,
      [
        column({ id: 'label', type: 'text', valueGetter: () => 'Sarah (UK)', valueSetter: setter }),
        column({ id: 'name', field: 'name', type: 'text' }),
      ],
      { label: 'Sarah (UK)', name: 'Sara' },
      { label: 'Sarah (UK)', name: 'Sarah' },
    );
    expect(setter).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, nextRow: { ...row, name: 'Sara' } });
    expect(row.name).toBe('Sarah');
  });

  it('uses valueSetter for a changed derived column and reports a throw as invalid', () => {
    const row = { id: '1', name: 'Sarah', city: 'London' };
    const saved = applyRowDrafts(
      row,
      [
        column({
          id: 'label',
          type: 'text',
          valueGetter: (item: typeof row) => `${item.name} (${item.city})`,
          valueSetter: (item: typeof row, value: unknown) => ({ ...item, name: String(value) }),
        }),
      ],
      { label: 'Sara (London)' },
      { label: 'Sarah (London)' },
    );
    expect(saved).toEqual({
      ok: true,
      nextRow: { id: '1', name: 'Sara (London)', city: 'London' },
    });

    const failed = applyRowDrafts(
      row,
      [
        column({
          id: 'label',
          type: 'text',
          valueSetter: () => {
            throw new Error('nope');
          },
        }),
      ],
      { label: 'Next' },
      { label: 'Sarah (London)' },
    );
    expect(failed).toEqual({ ok: false, errors: { label: true } });
    expect(row).toEqual({ id: '1', name: 'Sarah', city: 'London' });
  });
});
