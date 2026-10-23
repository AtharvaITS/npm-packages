import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersisted,
  readPersisted,
  STORAGE_PREFIX,
  writePersisted,
  type PersistedWrite,
} from '../../src/core/persist';
import type { GridState } from '../../src/types';
import type { GridStateApi } from '../../src/state/useGridState';
import { usePersistence, type FormatPersistence } from '../../src/state/usePersistence';

const allowed = { columnIds: ['name'], views: ['table', 'grid', 'list'] as const };

const savedFormat = {
  formatRules: [],
  headerStyle: {},
  textAlignment: {},
} satisfies Pick<PersistedWrite, 'formatRules' | 'headerStyle' | 'textAlignment'>;

function formatApi(): FormatPersistence {
  return {
    rules: [],
    setRules: vi.fn(),
    rulesControlled: false,
    headerStyle: {},
    setHeaderStyle: vi.fn(),
    headerStyleControlled: false,
    textAlignment: {},
    setTextAlignment: vi.fn(),
    textAlignmentControlled: false,
  };
}

function api(state: Partial<GridState> = {}, restore = vi.fn()): GridStateApi {
  return {
    views: ['table', 'grid', 'list'],
    state: {
      view: 'table',
      sort: [],
      filters: [],
      search: 'keep-me',
      page: 4,
      pageSize: 25,
      selection: ['row-1'],
      columnState: [],
      ...state,
    },
    setView() {},
    setSort() {},
    toggleSort() {},
    setSearch() {},
    setFilters() {},
    setPage() {},
    setPageSize() {},
    setSelection() {},
    setColumnState() {},
    restore,
  };
}

describe('usePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('restores once per key after columns are known', () => {
    writePersisted('orders', {
      view: 'grid',
      sort: [{ columnId: 'name', direction: 'asc' }],
      pageSize: 50,
      columns: [{ id: 'name', order: 0 }],
      ...savedFormat,
    });
    const restore = vi.fn();
    const { rerender } = renderHook(
      ({ key, columns }: { key?: string; columns: string[] }) =>
        usePersistence(key, api({}, restore), columns, formatApi()),
      { initialProps: { key: 'orders' as string | undefined, columns: [] as string[] } },
    );
    expect(restore).not.toHaveBeenCalled();
    rerender({ key: 'orders', columns: ['name'] });
    expect(restore).toHaveBeenCalledTimes(1);
    expect(restore.mock.calls[0]![0].view).toBe('grid');
    rerender({ key: 'orders', columns: ['name'] });
    expect(restore).toHaveBeenCalledTimes(1);

    writePersisted('people', { view: 'list', sort: [], pageSize: 10, columns: [], ...savedFormat });
    rerender({ key: 'people', columns: ['name'] });
    expect(restore).toHaveBeenCalledTimes(2);
    expect(restore.mock.calls[1]![0].view).toBe('list');
  });

  it('does not touch storage without a key', () => {
    const restore = vi.fn();
    renderHook(() => usePersistence(undefined, api({}, restore), ['name'], formatApi()));
    act(() => vi.advanceTimersByTime(1000));
    expect(restore).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it('debounces saves and flushes them on unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ view }: { view: GridState['view'] }) =>
        usePersistence('orders', api({ view, pageSize: 25, sort: [], columnState: [] }), ['name'], formatApi()),
      { initialProps: { view: 'table' as GridState['view'] } },
    );
    act(() => vi.advanceTimersByTime(300));
    expect(readPersisted('orders', { ...allowed, views: [...allowed.views] })!.view).toBe('table');

    rerender({ view: 'list' });
    act(() => vi.advanceTimersByTime(299));
    expect(readPersisted('orders', { ...allowed, views: [...allowed.views] })!.view).toBe('table');
    act(() => vi.advanceTimersByTime(1));
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'orders')!);
    expect(saved.view).toBe('list');
    expect(saved).not.toHaveProperty('search');
    expect(saved).not.toHaveProperty('selection');
    expect(saved).not.toHaveProperty('page');

    rerender({ view: 'grid' });
    unmount();
    expect(readPersisted('orders', { ...allowed, views: [...allowed.views] })!.view).toBe('grid');
    clearPersisted('orders');
  });
});
