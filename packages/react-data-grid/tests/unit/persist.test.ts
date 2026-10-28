import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersisted,
  createPersister,
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
  fontWeight: 'bold',
  textTransform: 'uppercase',
};
const textAlignment: TextAlignment = { alignment: 'center' };
const full = {
  view: 'grid' as const,
  sort: [{ columnId: 'age', direction: 'desc' as const }],
  pageSize: 50,
  columns: [{ id: 'name', width: 220, hidden: false, pinned: 'start' as const, order: 1 }],
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

  it('round-trips row grouping on saved columns', () => {
    writePersisted('emp', {
      ...full,
      columns: [
        { id: 'name', order: 1, rowGroup: true, rowGroupIndex: 0 },
        { id: 'age', order: 2, rowGroup: false },
      ],
    });
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.columns).toEqual([
      { id: 'name', order: 1, rowGroup: true, rowGroupIndex: 0 },
      { id: 'age', order: 2, rowGroup: false },
    ]);
  });

  it('keeps grouping when a legacy column order is migrated and drops invalid grouping fields', () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'emp',
      JSON.stringify({
        v: 1,
        columns: [
          { id: 'name', order: 0, rowGroup: true, rowGroupIndex: null },
          { id: 'age', order: 1, rowGroup: 'yes', rowGroupIndex: 2 },
          { id: 'missing', order: 2, rowGroup: true, rowGroupIndex: 1 },
        ],
      }),
    );
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.columns).toEqual([
      { id: 'name', order: 1, rowGroup: true },
      { id: 'age', order: 2, rowGroupIndex: 2 },
    ]);
  });

  it('reads a saved 0-based column order as a column number', () => {
    writePersisted('emp', {
      ...full,
      columns: [
        { id: 'name', order: 0 },
        { id: 'age', order: 1, width: 90 },
      ],
    });
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.columns).toEqual([
      { id: 'name', order: 1 },
      { id: 'age', order: 2, width: 90 },
    ]);
  });

  it('keeps bold and italic rule font styles and drops the old normal style', () => {
    writePersisted('emp', {
      ...full,
      formatRules: [
        { ...rule, id: 'bold', style: { fontStyle: 'bold' } },
        { ...rule, id: 'italic', style: { fontStyle: 'italic' } },
        { ...rule, id: 'plain', style: { fontStyle: 'normal' as never, backgroundColor: '#00ff00' } },
      ],
    });
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.formatRules?.map((item) => item.style)).toEqual([
      { fontStyle: 'bold' },
      { fontStyle: 'italic' },
      { backgroundColor: '#00ff00' },
    ]);
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

  it('reads an older header weight of 700 as bold', () => {
    writePersisted('emp', {
      ...full,
      headerStyle: { fontWeight: '700' as never, textTransform: 'uppercase' },
    });
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.headerStyle).toEqual({
      fontWeight: 'bold',
      textTransform: 'uppercase',
    });
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

  it('debounces writes and can flush or cancel the pending save', () => {
    vi.useFakeTimers();
    const persister = createPersister(300);
    persister.schedule('emp', full);
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })).toBeUndefined();
    vi.advanceTimersByTime(299);
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })).toEqual(full);

    persister.schedule('emp', { ...full, view: 'list' });
    persister.flush();
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.view).toBe('list');

    persister.schedule('emp', { ...full, view: 'table' });
    persister.cancel();
    vi.advanceTimersByTime(300);
    expect(readPersisted('emp', { ...ctx, views: [...ctx.views] })!.view).toBe('list');
    vi.useRealTimers();
  });
});
