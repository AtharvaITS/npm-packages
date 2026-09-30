import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersisted,
  readPersisted,
  writePersisted,
  STORAGE_PREFIX,
} from '../../src/core/persist';

const ctx = { columnIds: ['name', 'age'], views: ['table', 'grid', 'list'] as const };
const full = {
  view: 'grid' as const,
  sort: [{ columnId: 'age', direction: 'desc' as const }],
  pageSize: 50,
  columns: [{ id: 'name', width: 220, hidden: false, pinned: 'start' as const, order: 0 }],
};

describe('persist', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('writes { v: 1, view, sort, pageSize, columns } under the prefixed key', () => {
    writePersisted('emp', full);
    const raw = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'emp')!);
    expect(raw).toEqual({ v: 1, ...full });
    expect(Object.keys(raw).sort()).toEqual(['columns', 'pageSize', 'sort', 'v', 'view']);
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
