import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  resolveViews,
  useGridState,
} from '../../src/state/useGridState';

describe('resolveViews', () => {
  it('falls back to every view and drops duplicates and unknown names', () => {
    expect(resolveViews(undefined)).toEqual(['table', 'grid', 'list']);
    expect(resolveViews([])).toEqual(['table', 'grid', 'list']);
    expect(resolveViews(['list', 'list', 'nope' as 'list', 'grid'])).toEqual(['list', 'grid']);
  });
});

describe('useGridState', () => {
  it('starts from the documented defaults', () => {
    const { result } = renderHook(() => useGridState({ data: [] }, { warnKey: {} }));
    expect(result.current.state).toMatchObject({
      view: 'table',
      sort: [],
      filters: [],
      search: '',
      page: 0,
      pageSize: 25,
      selection: [],
      columnState: [],
    });
    expect(result.current.views).toEqual(['table', 'grid', 'list']);
    expect(DEFAULT_PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100]);
  });

  it('uses the first allowed view when table is not offered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useGridState({ data: [], views: ['grid', 'grid', 'list'], defaultView: 'table' }, { warnKey: {} }),
    );
    expect(result.current.views).toEqual(['grid', 'list']);
    expect(result.current.state.view).toBe('grid');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('resets to page 1 when search or filters change, and ignores a repeated search', () => {
    const onSearchChange = vi.fn();
    const onPageChange = vi.fn();
    const onFiltersChange = vi.fn();
    const onStateChange = vi.fn();
    const { result } = renderHook(() =>
      useGridState(
        { data: [], defaultPage: 3, onSearchChange, onPageChange, onFiltersChange, onStateChange },
        { warnKey: {} },
      ),
    );
    act(() => result.current.setSearch('ada'));
    expect(result.current.state).toMatchObject({ search: 'ada', page: 0 });
    expect(onSearchChange).toHaveBeenCalledWith('ada');
    expect(onPageChange).toHaveBeenCalledWith(0);
    expect(onStateChange.mock.calls.map((call) => call[1])).toEqual(['search', 'page']);

    onPageChange.mockClear();
    act(() => result.current.setSearch('ada'));
    expect(onPageChange).not.toHaveBeenCalled();

    act(() => result.current.setPage(4));
    onStateChange.mockClear();
    act(() =>
      result.current.setFilters([{ columnId: 'name', operator: 'contains', value: 'a' }]),
    );
    expect(result.current.state.page).toBe(0);
    expect(onFiltersChange).toHaveBeenCalled();
    expect(onStateChange.mock.calls.map((call) => call[1])).toEqual(['filters', 'page']);
  });

  it('floors the page, keeps the first visible row when the page size changes, and follows controlled props', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ page }: { page: number | undefined }) =>
        useGridState({ data: [], page, onPageChange, defaultPageSize: 25, onPageSizeChange }, { warnKey: {} }),
      { initialProps: { page: undefined as number | undefined } },
    );
    act(() => result.current.setPage(2.8));
    expect(result.current.state.page).toBe(2);
    act(() => result.current.setPage(-4));
    expect(result.current.state.page).toBe(0);
    act(() => result.current.setPage(2));
    act(() => result.current.setPage(2));
    expect(onPageChange).toHaveBeenCalledTimes(3);

    act(() => result.current.setPageSize(50));
    expect(result.current.state).toMatchObject({ pageSize: 50, page: 1 });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    act(() => result.current.setPageSize(50, 0));
    expect(onPageSizeChange).toHaveBeenCalledTimes(1);

    rerender({ page: 6 });
    expect(result.current.state.page).toBe(6);
    act(() => result.current.setPage(1));
    expect(result.current.state.page).toBe(6);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('cycles sort, appends a multi-sort, and changes the view', () => {
    const onViewChange = vi.fn();
    const onSortChange = vi.fn();
    const { result } = renderHook(() =>
      useGridState({ data: [], multiSort: true, onViewChange, onSortChange }, { warnKey: {} }),
    );
    act(() => result.current.toggleSort('name', false));
    act(() => result.current.toggleSort('name', false));
    act(() => result.current.toggleSort('name', false));
    expect(onSortChange.mock.calls.map((call) => call[0])).toEqual([
      [{ columnId: 'name', direction: 'asc' }],
      [{ columnId: 'name', direction: 'desc' }],
      [],
    ]);
    act(() => result.current.toggleSort('name', false));
    act(() => result.current.toggleSort('age', true));
    expect(result.current.state.sort).toEqual([
      { columnId: 'name', direction: 'asc' },
      { columnId: 'age', direction: 'asc' },
    ]);
    act(() => result.current.setView('table'));
    expect(onViewChange).not.toHaveBeenCalled();
    act(() => result.current.setView('list'));
    expect(result.current.state.view).toBe('list');
    expect(onViewChange).toHaveBeenCalledWith('list');
  });

  it('restores saved preferences silently, and leaves controlled values alone', () => {
    const onViewChange = vi.fn();
    const onSortChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const { result } = renderHook(() =>
      useGridState(
        { data: [], view: 'list', onViewChange, onSortChange, onPageSizeChange },
        { warnKey: {} },
      ),
    );
    act(() =>
      result.current.restore({
        view: 'grid',
        sort: [{ columnId: 'age', direction: 'desc' }],
        pageSize: 100,
        columns: [{ id: 'name', order: 1, hidden: true }],
      }),
    );
    expect(result.current.state.view).toBe('list');
    expect(result.current.state.sort).toEqual([{ columnId: 'age', direction: 'desc' }]);
    expect(result.current.state.pageSize).toBe(100);
    expect(result.current.state.columnState).toEqual([{ id: 'name', order: 1, hidden: true }]);
    expect(onViewChange).not.toHaveBeenCalled();
    expect(onSortChange).not.toHaveBeenCalled();
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it('warns when the page size is outside the offered options', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const key = {};
    const { rerender } = renderHook(() =>
      useGridState({ data: [], pageSize: 7, pageSizeOptions: [10, 20] }, { warnKey: key }),
    );
    rerender();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('pageSize 7');
    warn.mockRestore();
  });

  it('records selection and column state', () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() =>
      useGridState({ data: [], onStateChange }, { warnKey: {} }),
    );
    act(() => result.current.setSelection(['a', 'b']));
    act(() => result.current.setColumnState([{ id: 'name', order: 0 }]));
    expect(result.current.state.selection).toEqual(['a', 'b']);
    expect(result.current.state.columnState).toEqual([{ id: 'name', order: 0 }]);
    expect(onStateChange.mock.calls.map((call) => call[1])).toEqual(['selection', 'columnState']);
  });
});
