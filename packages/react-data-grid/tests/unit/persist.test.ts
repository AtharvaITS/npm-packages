import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersisted,
  readPersisted,
  writePersisted,
  STORAGE_PREFIX,
} from '../../src/core/persist';
import type { ConditionalFormatRule, HeaderStyle, TextAlignment } from '../../src/types';

const ctx = { columnIds: ['name', 'age'], views: ['table', 'grid', 'list'] as const };
const rule: ConditionalFormatRule = {
  id: 'r1',
  columnId: 'age',
  operator: 'gt',
  value: '10',
  scope: 'cell',
  style: { backgroundColor: '#ff0000', fontWeight: '700' },
};
const headerStyle: HeaderStyle = {
  backgroundColor: '#112233',
  textColor: '#ffffff',
  fontSize: 14,
  fontWeight: '700',
  textTransform: 'uppercase',
};
const textAlignment: TextAlignment = { alignment: 'center' };
const full = {
  view: 'grid' as const,
  sort: [{ columnId: 'age', direction: 'desc' as const }],
  pageSize: 50,
  columns: [{ id: 'name', width: 220, hidden: false, pinned: 'start' as const, order: 0 }],
  formatRules: [] as ConditionalFormatRule[],
  headerStyle: {} as HeaderStyle,
  textAlignment: {} as TextAlignment,
};

describe('persist', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('writes view, sort, page size, columns, formatting rules, header style and text alignment', () => {
    writePersisted('emp', { ...full, formatRules: [rule], headerStyle, textAlignment });
    const raw = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'emp')!);
    expect(raw).toEqual({ v: 1, ...full, formatRules: [rule], headerStyle, textAlignment });
    expect(Object.keys(raw).sort()).toEqual([
      'columns',
      'formatRules',
      'headerStyle',
      'pageSize',
      'sort',
      'textAlignment',
      'v',
      'view',
    ]);
  });

  it('never stores selection, search, filters or page', () => {
    writePersisted('emp', {
      ...full,
      selection: ['x'],
      search: 'q',
      filters: [],
      page: 3,
    } as never);
    const raw = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'emp')!);
    expect(raw).not.toHaveProperty('selection');
    expect(raw).not.toHaveProperty('search');
    expect(raw).not.toHaveProperty('filters');
    expect(raw).not.toHaveProperty('page');
  });

  it('round-trips valid state', () => {
    writePersisted('emp', full);
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })).toEqual(full);
  });

  it('discards unknown versions and garbage', () => {
    localStorage.setItem(STORAGE_PREFIX + 'emp', JSON.stringify({ v: 2, view: 'grid' }));
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })).toBeUndefined();
    localStorage.setItem(STORAGE_PREFIX + 'emp', '{not json');
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })).toBeUndefined();
  });

  it('ignores unknown columns and disallowed views', () => {
    writePersisted('emp', {
      ...full,
      view: 'list',
      sort: [{ columnId: 'gone', direction: 'asc' }],
      columns: [
        { id: 'gone', order: 0 },
        { id: 'age', order: 1, width: 90 },
      ],
    });
    const saved = readPersisted('emp', { columnIds: ['name', 'age'], views: ['table', 'grid'] })!;
    expect(saved.view).toBeUndefined();
    expect(saved.sort).toEqual([]);
    expect(saved.columns).toEqual([{ id: 'age', order: 1, width: 90 }]);
  });

  it('round-trips formatting rules, header style and text alignment, and drops invalid ones', () => {
    writePersisted('emp', {
      ...full,
      formatRules: [
        rule,
        { ...rule, id: 'gone', columnId: 'missing' },
        { ...rule, id: 'bad', operator: 'nope' as never },
      ],
      headerStyle: { ...headerStyle, fontSize: 0, fontWeight: 'nope' as never },
      textAlignment: { alignment: 'nope' as never },
    });
    const saved = readPersisted('emp', { ...ctx, views: [...ctx.views] })!;
    expect(saved.formatRules).toEqual([rule]);
    expect(saved.headerStyle).toEqual({
      backgroundColor: '#112233',
      textColor: '#ffffff',
      textTransform: 'uppercase',
    });
    expect(saved.textAlignment).toEqual({});
  });

  it('treats a saved empty rule list, header style and text alignment as an explicit delete', () => {
    writePersisted('emp', { ...full, formatRules: [], headerStyle: {}, textAlignment: {} });
    const saved = readPersisted('emp', { ...ctx, views: [...ctx.views] })!;
    expect(saved.formatRules).toEqual([]);
    expect(saved.headerStyle).toEqual({});
    expect(saved.textAlignment).toEqual({});
  });

  it('leaves formatting fields unset when an older payload omits them', () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'emp',
      JSON.stringify({ v: 1, view: 'grid', sort: [], pageSize: 25, columns: [] }),
    );
    const saved = readPersisted('emp', { ...ctx, views: [...ctx.views] })!;
    expect(saved.formatRules).toBeUndefined();
    expect(saved.headerStyle).toBeUndefined();
    expect(saved.textAlignment).toBeUndefined();
    expect(saved.view).toBe('grid');
  });

  it('falls back to memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writePersisted('mem', full)).not.toThrow();
    expect(readPersisted('mem', { ...ctx, views: [...ctx.views] })).toEqual(full);
    clearPersisted('mem');
    expect(readPersisted('mem', { ...ctx, views: [...ctx.views] })).toBeUndefined();
  });
});
