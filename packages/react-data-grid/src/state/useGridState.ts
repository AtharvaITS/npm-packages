import { useCallback, useMemo, useRef } from 'react';
import { warn } from '../dev/warn';
import { pageForFirstVisible } from '../core/paginate';
import type { PersistedState } from '../core/persist';
import { toggleSort as nextSort } from '../core/sort';
import type {
  ReactDataGridProps,
  ColumnStateItem,
  FilterCondition,
  GridState,
  RowId,
  SortItem,
  ViewType,
} from '../types';
import { useControllableState } from './useControllableState';

export const ALL_VIEWS: ViewType[] = ['table', 'grid', 'list'];
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY: never[] = [];

export function resolveViews(views: ViewType[] | undefined): ViewType[] {
  const valid = (views ?? []).filter((v) => ALL_VIEWS.includes(v));
  return valid.length > 0 ? Array.from(new Set(valid)) : ALL_VIEWS;
}

export interface GridStateApi {
  state: GridState;
  views: ViewType[];
  setView(view: ViewType): void;
  setSort(sort: SortItem[]): void;
  toggleSort(columnId: string, additive: boolean): void;
  setSearch(search: string): void;
  setFilters(filters: FilterCondition[]): void;
  setPage(page: number): void;
  setPageSize(pageSize: number, firstVisibleIndex?: number): void;
  setSelection(selection: RowId[]): void;
  setColumnState(columnState: ColumnStateItem[]): void;
  restore(saved: PersistedState): void;
}

/**
 * All view state of one component instance (data model §6), controlled or
 * uncontrolled per key, with the transition rules from data model §6.1.
 */
export function useGridState<TRow>(
  props: ReactDataGridProps<TRow>,
  options: { warnKey: object },
): GridStateApi {
  const { warnKey } = options;
  const views = useMemo(() => resolveViews(props.views), [props.views]);

  const pickView = (v: ViewType | undefined, source: string): ViewType | undefined => {
    if (v === undefined) return undefined;
    if (views.includes(v)) return v;
    warn(
      warnKey,
      `${source} "${v}" is not in the allowed views (${views.join(', ')}); using "${views[0]}".`,
    );
    return views[0]!;
  };

  const [viewRaw, setViewRaw] = useControllableState<ViewType>({
    value: pickView(props.view, 'view'),
    defaultValue: () =>
      pickView(props.defaultView, 'defaultView') ?? (views.includes('table') ? 'table' : views[0]!),
    onChange: props.onViewChange,
  });
  const view = views.includes(viewRaw) ? viewRaw : views[0]!;

  const [sort, setSortRaw, sortControlled] = useControllableState<SortItem[]>({
    value: props.sort,
    defaultValue: props.defaultSort ?? EMPTY,
    onChange: props.onSortChange,
  });
  const [search, setSearchRaw] = useControllableState<string>({
    value: props.search,
    defaultValue: props.defaultSearch ?? '',
    onChange: props.onSearchChange,
  });
  const [filters, setFiltersRaw] = useControllableState<FilterCondition[]>({
    value: props.filters,
    defaultValue: props.defaultFilters ?? EMPTY,
    onChange: props.onFiltersChange,
  });
  const [page, setPageRaw] = useControllableState<number>({
    value: props.page,
    defaultValue: props.defaultPage ?? 0,
    onChange: props.onPageChange,
  });
  const [pageSize, setPageSizeRaw, pageSizeControlled] = useControllableState<number>({
    value: props.pageSize,
    defaultValue: props.defaultPageSize ?? 25,
    onChange: props.onPageSizeChange,
  });
  const [selection, setSelectionRaw] = useControllableState<RowId[]>({
    value: props.selection,
    defaultValue: props.defaultSelection ?? EMPTY,
    onChange: undefined, // onSelectionChange needs rows; the component calls it.
  });
  const [columnState, setColumnStateRaw, columnStateControlled] = useControllableState<
    ColumnStateItem[]
  >({
    value: props.columnState,
    defaultValue: props.defaultColumnState ?? EMPTY,
    onChange: props.onColumnStateChange,
  });
  const viewControlled = props.view !== undefined;

  const pageSizeOptions = props.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
  if (!pageSizeOptions.includes(pageSize)) {
    warn(
      warnKey,
      `pageSize ${pageSize} is not in pageSizeOptions [${pageSizeOptions.join(', ')}].`,
    );
  }

  const state = useMemo<GridState>(
    () => ({ view, sort, filters, search, page, pageSize, selection, columnState }),
    [view, sort, filters, search, page, pageSize, selection, columnState],
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const onStateChangeRef = useRef(props.onStateChange);
  onStateChangeRef.current = props.onStateChange;

  const report = useCallback(<K extends keyof GridState>(key: K, value: GridState[K]) => {
    const next = { ...stateRef.current, [key]: value };
    stateRef.current = next;
    onStateChangeRef.current?.(next, key);
  }, []);

  const setView = useCallback(
    (v: ViewType) => {
      if (v === stateRef.current.view) return;
      setViewRaw(v);
      report('view', v);
    },
    [setViewRaw, report],
  );

  const setPage = useCallback(
    (p: number) => {
      const next = Math.max(0, Math.floor(p));
      if (next === stateRef.current.page) return;
      setPageRaw(next);
      report('page', next);
    },
    [setPageRaw, report],
  );

  const setSort = useCallback(
    (s: SortItem[]) => {
      setSortRaw(s);
      report('sort', s);
    },
    [setSortRaw, report],
  );

  const multiSort = !!props.multiSort;
  const toggleSort = useCallback(
    (columnId: string, additive: boolean) => {
      setSort(nextSort(stateRef.current.sort, columnId, multiSort && additive));
    },
    [setSort, multiSort],
  );

  const setSearch = useCallback(
    (s: string) => {
      if (s === stateRef.current.search) return;
      setSearchRaw(s);
      report('search', s);
      setPage(0);
    },
    [setSearchRaw, report, setPage],
  );

  const setFilters = useCallback(
    (f: FilterCondition[]) => {
      setFiltersRaw(f);
      report('filters', f);
      setPage(0);
    },
    [setFiltersRaw, report, setPage],
  );

  const setPageSize = useCallback(
    (size: number, firstVisibleIndex?: number) => {
      const current = stateRef.current;
      if (size === current.pageSize) return;
      const first = firstVisibleIndex ?? current.page * current.pageSize;
      setPageSizeRaw(size);
      report('pageSize', size);
      setPage(pageForFirstVisible(first, size));
    },
    [setPageSizeRaw, report, setPage],
  );

  const setSelection = useCallback(
    (s: RowId[]) => {
      setSelectionRaw(s);
      report('selection', s);
    },
    [setSelectionRaw, report],
  );

  const setColumnState = useCallback(
    (c: ColumnStateItem[]) => {
      setColumnStateRaw(c);
      report('columnState', c);
    },
    [setColumnStateRaw, report],
  );

  // Saved preferences act as the initial *uncontrolled* state; controlled props win.
  const restore = useCallback(
    (saved: PersistedState) => {
      if (saved.view && !viewControlled) setViewRaw(saved.view, { silent: true });
      if (saved.sort && !sortControlled) setSortRaw(saved.sort, { silent: true });
      if (saved.pageSize && !pageSizeControlled) setPageSizeRaw(saved.pageSize, { silent: true });
      if (saved.columns && saved.columns.length > 0 && !columnStateControlled) {
        setColumnStateRaw(saved.columns, { silent: true });
      }
    },
    [
      viewControlled,
      sortControlled,
      pageSizeControlled,
      columnStateControlled,
      setViewRaw,
      setSortRaw,
      setPageSizeRaw,
      setColumnStateRaw,
    ],
  );

  return useMemo(
    () => ({
      state,
      views,
      setView,
      setSort,
      toggleSort,
      setSearch,
      setFilters,
      setPage,
      setPageSize,
      setSelection,
      setColumnState,
      restore,
    }),
    [
      state,
      views,
      setView,
      setSort,
      toggleSort,
      setSearch,
      setFilters,
      setPage,
      setPageSize,
      setSelection,
      setColumnState,
      restore,
    ],
  );
}
