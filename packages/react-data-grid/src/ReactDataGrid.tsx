import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { LiveRegion, useAnnouncer } from './a11y/LiveRegion';
import {
  applyColumnState,
  moveColumn,
  neighbourId,
  setColumnHidden,
  setColumnPinned,
  setColumnWidth,
  type EffectiveColumn,
} from './core/columnState';
import { getColumnValue, resolveColumns } from './core/columns';
import { canEditColumn, parseEditedValue } from './core/editValue';
import { isConditionActive } from './core/filter';
import { normalizeData, resolveRowIds } from './core/normalize';
import { clampPage, pageRange, pageSlice } from './core/paginate';
import { runPipeline } from './core/pipeline';
import {
  addRange,
  headerState as computeHeaderState,
  pruneSelection,
  selectRange,
  toggle,
} from './core/selection';
import { warn } from './dev/warn';
import { mergeMessages } from './i18n/messages';
import { Pagination } from './pagination/Pagination';
import {
  GridContext,
  type ColumnActions,
  type GridContextValue,
  type SelectionApi,
} from './state/GridContext';
import { useGridState } from './state/useGridState';
import { useIsomorphicLayoutEffect } from './state/useIsomorphicLayoutEffect';
import { ConditionalFormatProvider } from './conditional/FormatContext';
import { EMPTY_HEADER_STYLE } from './conditional/headerStyle';
import { EMPTY_TEXT_ALIGNMENT } from './conditional/textAlignment';
import { useControllableState } from './state/useControllableState';
import { usePersistence } from './state/usePersistence';
import { useServerData } from './state/useServerData';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { LoadingOverlay } from './states/LoadingOverlay';
import { NoResultsState } from './states/NoResultsState';
import { Toolbar } from './toolbar/Toolbar';
import type {
  ReactDataGridProps,
  ConditionalFormatRule,
  Density,
  HeaderStyle,
  RowId,
  TextAlignment,
  ThemeToken,
} from './types';
import { GridView } from './views/grid/GridView';
import { ListView } from './views/list/ListView';
import { TableView } from './views/table/TableView';

const ROW_HEIGHTS: Record<Density, number> = { compact: 32, standard: 40, comfortable: 52 };
const EMPTY_IDS: RowId[] = [];
const EMPTY_FORMAT_RULES: ConditionalFormatRule[] = [];

function tokenToVar(token: string) {
  return '--aits-' + token.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

function parsePx(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const m = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  return m ? Number(m[1]) : undefined;
}

/** Browser locale after mount; 'en-US' on the server and first client render (no hydration mismatch). */
function useLocale(locale: string | undefined): string {
  const [detected, setDetected] = useState('en-US');
  useIsomorphicLayoutEffect(() => {
    if (locale || typeof navigator === 'undefined') return;
    const lang = navigator.language;
    if (lang && lang !== detected) setDetected(lang);
  }, [locale]);
  return locale || detected;
}

/**
 * ReactDataGrid: shows `data` as a table, card grid or list with sorting,
 * search, filters, paging or virtual scrolling, selection and column management.
 */
export function ReactDataGrid<TRow = Record<string, unknown>>(props: ReactDataGridProps<TRow>) {
  const [warnKey] = useState(() => ({}));
  const rootRef = useRef<HTMLDivElement>(null);
  const serverMode = props.dataMode === 'server';
  const messages = useMemo(() => mergeMessages(props.messages), [props.messages]);
  const locale = useLocale(props.locale);
  const { message: liveMessage, announce } = useAnnouncer();

  // ---- State ---------------------------------------------------------------
  const api = useGridState(props, { warnKey });
  const { state } = api;
  const [formatRules, setFormatRules, formatRulesControlled] = useControllableState<
    ConditionalFormatRule[]
  >({
    value: props.formatRules,
    defaultValue: props.defaultFormatRules ?? EMPTY_FORMAT_RULES,
    onChange: props.onFormatRulesChange,
  });
  const [headerStyle, setHeaderStyle, headerStyleControlled] = useControllableState<HeaderStyle>({
    value: props.headerStyle,
    defaultValue: props.defaultHeaderStyle ?? EMPTY_HEADER_STYLE,
    onChange: props.onHeaderStyleChange,
  });
  const [textAlignment, setTextAlignment, textAlignmentControlled] = useControllableState<TextAlignment>({
    value: props.textAlignment,
    defaultValue: props.defaultTextAlignment ?? EMPTY_TEXT_ALIGNMENT,
    onChange: props.onTextAlignmentChange,
  });
  const server = useServerData(
    props,
    {
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      filters: state.filters,
      search: state.search,
    },
    warnKey,
  );

  // ---- Data ----------------------------------------------------------------
  const source: unknown = serverMode && server.rows ? server.rows : props.data;
  const normalized = useMemo(() => normalizeData<TRow>(source, warnKey), [source, warnKey]);
  const rows = normalized.rows;
  const getRowId = props.getRowId as Parameters<typeof resolveRowIds<TRow>>[2];
  const rowIds = useMemo(
    () => resolveRowIds(rows, normalized.sourceIndexes, getRowId, warnKey),
    [rows, normalized.sourceIndexes, getRowId, warnKey],
  );
  const idToIndex = useMemo(() => {
    const map = new Map<RowId, number>();
    rowIds.forEach((id, i) => map.set(id, i));
    return map;
  }, [rowIds]);

  // Server mode keeps the same derived columns across pages when possible.
  const columnsSource = props.columns;
  const resolved = useMemo(
    () => resolveColumns(columnsSource, rows, warnKey),
    [columnsSource, rows, warnKey],
  );
  const columnIds = useMemo(() => resolved.map((c) => c.id), [resolved]);
  usePersistence(props.persistStateKey, api, columnIds, {
    rules: formatRules,
    setRules: setFormatRules,
    rulesControlled: formatRulesControlled,
    headerStyle,
    setHeaderStyle,
    headerStyleControlled,
    textAlignment,
    setTextAlignment,
    textAlignmentControlled,
  });

  const effective = useMemo(
    () => applyColumnState(resolved, state.columnState),
    [resolved, state.columnState],
  );
  const searchKey = effective.visible
    .filter((c) => c.searchable)
    .map((c) => c.id)
    .join('\u0001');
  const searchColumns = useMemo(
    () => effective.visible.filter((c) => c.searchable),
    // Only re-run the pipeline when the set of searched columns changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchKey, resolved],
  );

  // ---- Pipeline: search → filter → sort (client mode) ----------------------
  const pipeline = useMemo(() => {
    if (serverMode) {
      const indexes = rows.map((_, i) => i);
      return { indexes, matchCount: indexes.length };
    }
    return runPipeline({
      rows,
      columns: resolved,
      searchColumns,
      search: state.search,
      filters: state.filters,
      sort: state.sort,
      locale,
    });
  }, [serverMode, rows, resolved, searchColumns, state.search, state.filters, state.sort, locale]);

  const pagination: 'pages' | 'scroll' = serverMode ? 'pages' : (props.pagination ?? 'pages');
  if (serverMode && props.pagination === 'scroll') {
    warn(warnKey, 'pagination="scroll" is not supported with dataMode="server"; using pages.');
  }
  if (pagination === 'scroll' && props.height === 'auto') {
    warn(warnKey, 'pagination="scroll" needs a fixed height; using 600px.');
  }

  const totalCount = serverMode
    ? Math.max(server.totalCount ?? rows.length, rows.length)
    : pipeline.matchCount;
  const dataCount = serverMode ? totalCount : rows.length;
  const page = pagination === 'pages' ? clampPage(state.page, totalCount, state.pageSize) : 0;

  // Keep the stored page valid when data or filters shrink (US4 scenario 3).
  const serverLoading = serverMode && server.loading;
  useEffect(() => {
    if (pagination !== 'pages' || serverLoading) return;
    if (page !== state.page) api.setPage(page);
  }, [page, state.page, pagination, serverLoading, api]);

  const displayIndexes = useMemo(() => {
    if (serverMode || pagination === 'scroll') return pipeline.indexes;
    return pageSlice(pipeline.indexes, page, state.pageSize);
  }, [serverMode, pagination, pipeline.indexes, page, state.pageSize]);
  const rowOffset = pagination === 'pages' ? page * state.pageSize : 0;

  // ---- Selection -----------------------------------------------------------
  const mode = props.selectionMode ?? 'none';
  const isRowSelectable = props.isRowSelectable;
  const isSelectable = useCallback(
    (rowIndex: number) => {
      if (!isRowSelectable) return true;
      try {
        return !!isRowSelectable(rows[rowIndex] as TRow);
      } catch {
        return false;
      }
    },
    [isRowSelectable, rows],
  );
  const orderedIds = useMemo(
    () => pipeline.indexes.map((i) => rowIds[i]!),
    [pipeline.indexes, rowIds],
  );
  const selectableIds = useMemo(
    () =>
      mode === 'none' ? EMPTY_IDS : pipeline.indexes.filter(isSelectable).map((i) => rowIds[i]!),
    [mode, pipeline.indexes, isSelectable, rowIds],
  );
  const selectedSet = useMemo(
    () => new Set(mode === 'none' ? EMPTY_IDS : state.selection),
    [mode, state.selection],
  );
  const headerState = useMemo(
    () => computeHeaderState(selectedSet, selectableIds),
    [selectedSet, selectableIds],
  );
  const anchor = useRef<RowId | null>(null);
  const onSelectionChange = props.onSelectionChange;
  const selectionRef = useRef(state.selection);
  selectionRef.current = state.selection;

  const commitSelection = useCallback(
    (ids: RowId[]) => {
      api.setSelection(ids);
      if (onSelectionChange) {
        const selectedRows: TRow[] = [];
        for (const id of ids) {
          const index = idToIndex.get(id);
          if (index !== undefined) selectedRows.push(rows[index] as TRow);
        }
        onSelectionChange(ids, selectedRows);
      }
    },
    [api, onSelectionChange, idToIndex, rows],
  );

  const selection: SelectionApi = useMemo(() => {
    const isSelectableId = (id: RowId) => {
      const index = idToIndex.get(id);
      return index !== undefined && isSelectable(index);
    };
    return {
      mode,
      selected: selectedSet,
      isSelectable,
      headerState,
      selectableCount: selectableIds.length,
      toggleRow(rowIndex, options) {
        if (mode === 'none') return;
        const id = rowIds[rowIndex];
        if (id === undefined || !isSelectable(rowIndex)) return;
        const current = selectionRef.current;
        let next: RowId[];
        if (options?.range && mode === 'multi' && anchor.current !== null) {
          next = addRange(current, selectRange(orderedIds, anchor.current, id, isSelectableId));
        } else {
          next = toggle(current, id, mode);
        }
        anchor.current = id;
        commitSelection(next);
      },
      selectAll() {
        if (mode !== 'multi') return;
        commitSelection(addRange(selectionRef.current, selectableIds));
      },
      clear() {
        anchor.current = null;
        commitSelection([]);
      },
    };
  }, [
    mode,
    selectedSet,
    isSelectable,
    headerState,
    selectableIds,
    rowIds,
    orderedIds,
    idToIndex,
    commitSelection,
  ]);

  // Drop selected rows that no longer exist after new data arrives (client mode).
  useEffect(() => {
    if (serverMode || mode === 'none') return;
    const valid = new Set(rowIds);
    const pruned = pruneSelection(selectionRef.current, valid);
    if (pruned !== selectionRef.current) commitSelection([...pruned]);
    // Only when the data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIds]);

  // ---- Column actions (FR-037) ---------------------------------------------
  const setColumnState = api.setColumnState;
  const columnActions: ColumnActions = useMemo(() => {
    const ordered = effective.ordered;
    const current = state.columnState;
    return {
      canResize: props.enableColumnResize !== false,
      canReorder: props.enableColumnReorder !== false,
      canHide: props.enableColumnHide !== false,
      canPin: props.enableColumnPin !== false,
      setWidth: (id, width) => setColumnState(setColumnWidth(ordered, current, id, width)),
      setHidden: (id, hidden) => {
        const next = setColumnHidden(ordered, current, id, hidden);
        if (!next) return false;
        setColumnState(next);
        return true;
      },
      setPinned: (id, pinned) => setColumnState(setColumnPinned(ordered, current, id, pinned)),
      move: (id, targetId) => setColumnState(moveColumn(ordered, current, id, targetId)),
      moveBy: (id, delta) => {
        const target = neighbourId(effective.visible, id, delta);
        if (target) setColumnState(moveColumn(ordered, current, id, target));
      },
    };
  }, [
    effective,
    state.columnState,
    setColumnState,
    props.enableColumnResize,
    props.enableColumnReorder,
    props.enableColumnHide,
    props.enableColumnPin,
  ]);

  // ---- Card / list layout columns ------------------------------------------
  const { titleColumn, subtitleColumn, imageColumn } = useMemo(() => {
    const visible = effective.visible;
    const byId = (id: string | undefined) =>
      id === undefined
        ? undefined
        : (visible.find((c) => c.id === id) ?? effective.ordered.find((c) => c.id === id));
    const textual = visible.filter((c) => c.type !== 'image');
    const image =
      props.imageField !== undefined
        ? byId(props.imageField)
        : visible.find((c) => c.type === 'image');
    const title = byId(props.titleField) ?? textual[0] ?? visible[0];
    const subtitle = byId(props.subtitleField) ?? textual.find((c) => c !== title);
    return {
      titleColumn: title as EffectiveColumn<TRow> | undefined,
      subtitleColumn: subtitle as EffectiveColumn<TRow> | undefined,
      imageColumn: image as EffectiveColumn<TRow> | undefined,
    };
  }, [effective, props.imageField, props.titleField, props.subtitleField]);

  // ---- Appearance ----------------------------------------------------------
  const theme = props.theme ?? {};
  const density: Density = theme.density ?? 'standard';
  const colorScheme = theme.colorScheme ?? 'auto';
  const rowHeight = parsePx(theme.tokens?.rowHeight) ?? ROW_HEIGHTS[density] ?? 40;
  const rootStyle = useMemo(() => {
    const style: Record<string, string> = {};
    const tokens = theme.tokens ?? {};
    for (const key of Object.keys(tokens) as ThemeToken[]) {
      const value = tokens[key];
      if (value !== undefined && value !== null) style[tokenToVar(key)] = String(value);
    }
    return { ...style, ...(props.style ?? {}) } as CSSProperties;
  }, [theme.tokens, props.style]);

  const [computedRtl, setComputedRtl] = useState(false);
  const direction = props.direction ?? 'auto';
  useIsomorphicLayoutEffect(() => {
    if (direction !== 'auto' || !rootRef.current) return;
    const rtl = getComputedStyle(rootRef.current).direction === 'rtl';
    if (rtl !== computedRtl) setComputedRtl(rtl);
  });
  const rtl = direction === 'rtl' || (direction === 'auto' && computedRtl);

  // ---- Announcements (FR-042) -----------------------------------------------
  const conditionsActive =
    state.search.trim() !== '' || state.filters.some((f) => isConditionActive(f, resolved));
  const announceKey = JSON.stringify([state.search, state.filters, state.sort, totalCount]);
  const pageKey = `${page}:${state.pageSize}`;
  const lastAnnounce = useRef({ announceKey, pageKey });
  useEffect(() => {
    const last = lastAnnounce.current;
    if (last.announceKey !== announceKey) {
      announce(messages.resultsCount(totalCount));
    } else if (last.pageKey !== pageKey) {
      const range = pageRange(page, state.pageSize, totalCount);
      announce(messages.pageRange(range.from, range.to, totalCount));
    }
    lastAnnounce.current = { announceKey, pageKey };
  }, [announceKey, pageKey, announce, messages, totalCount, page, state.pageSize]);

  const onRowActivate = props.onRowActivate;
  const activateRow = useCallback(
    (rowIndex: number, event: MouseEvent | KeyboardEvent) => {
      const row = rows[rowIndex];
      const id = rowIds[rowIndex];
      if (row !== undefined && id !== undefined) onRowActivate?.(row as TRow, id, event);
    },
    [rows, rowIds, onRowActivate],
  );

  const onCellEdit = props.onCellEdit;
  const [editing, setEditing] = useState<{ rowId: RowId; columnId: string } | null>(null);
  const startEdit = useCallback(
    (rowIndex: number, columnId: string) => {
      if (!onCellEdit) return;
      const column = effective.ordered.find((item) => item.id === columnId);
      if (!column || !canEditColumn(column)) return;
      const rowId = rowIds[rowIndex];
      if (rowId === undefined) return;
      setEditing({ rowId, columnId });
    },
    [onCellEdit, effective.ordered, rowIds],
  );
  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);
  const commitEdit = useCallback(
    (draft: string | boolean) => {
      const current = editing;
      setEditing(null);
      if (!current || !onCellEdit) return;
      const rowIndex = rowIds.indexOf(current.rowId);
      const row = rows[rowIndex] as TRow | undefined;
      const column = effective.ordered.find((item) => item.id === current.columnId);
      if (row === undefined || !column || !canEditColumn(column)) return;
      const previousValue = getColumnValue<TRow>(row, column);
      const parsed = parseEditedValue(column, previousValue, draft);
      if (!parsed.ok) return;
      let nextRow: TRow | undefined;
      if (column.valueSetter) {
        try {
          nextRow = column.valueSetter(row, parsed.value);
        } catch {
          return;
        }
      } else if (!column.field) {
        return;
      }
      onCellEdit({
        row,
        rowId: current.rowId,
        columnId: column.id,
        field: column.field ?? column.id,
        previousValue,
        value: parsed.value,
        ...(nextRow !== undefined ? { nextRow } : {}),
      });
    },
    [editing, onCellEdit, rowIds, rows, effective.ordered],
  );

  const clearFilters = useCallback(() => {
    api.setSearch('');
    api.setFilters([]);
  }, [api]);

  const ctx: GridContextValue<TRow> = {
    props,
    warnKey,
    rows,
    rowIds,
    columns: effective.ordered,
    visibleColumns: effective.visible,
    columnState: state.columnState,
    messages,
    locale,
    rtl,
    formatOptions: { locale, messages, warnKey },
    api,
    serverMode,
    pagination,
    displayIndexes,
    rowOffset,
    totalCount,
    dataCount,
    selection,
    columnActions,
    activateRow,
    editing,
    startEdit,
    commitEdit,
    cancelEdit,
    announce,
    rowHeight,
    scrollHeight: props.height === undefined || props.height === 'auto' ? 600 : props.height,
    titleColumn,
    subtitleColumn,
    imageColumn,
    cardFieldLimit: Math.max(0, props.cardFieldLimit ?? 6),
    cardMinWidth: props.cardMinWidth ?? 240,
    clearFilters,
    hasActiveConditions: conditionsActive,
    loading: server.loading,
  };

  // ---- Render --------------------------------------------------------------
  const loading = server.loading;
  const error = server.error;
  const hasRows = rows.length > 0;
  let content;
  if (loading && !hasRows) content = <LoadingOverlay skeleton />;
  else if (dataCount === 0 && !conditionsActive) content = <EmptyState />;
  else if (totalCount === 0 || displayIndexes.length === 0)
    content = hasRows || serverMode ? <NoResultsState /> : <EmptyState />;
  else if (state.view === 'grid') content = <GridView />;
  else if (state.view === 'list') content = <ListView />;
  else content = <TableView />;

  const showToolbar = serverMode || rows.length > 0;
  const showPagination = pagination === 'pages' && totalCount > 0;

  return (
    <div
      ref={rootRef}
      id={props.id}
      className={'aits-root' + (props.className ? ' ' + props.className : '')}
      data-view={state.view}
      data-density={density}
      data-color-scheme={colorScheme}
      dir={direction === 'auto' ? undefined : direction}
      style={rootStyle}
    >
      <GridContext.Provider value={ctx as GridContextValue}>
        <ConditionalFormatProvider
          rules={formatRules}
          setRules={setFormatRules}
          headerStyle={headerStyle}
          setHeaderStyle={setHeaderStyle}
          textAlignment={textAlignment}
          setTextAlignment={setTextAlignment}
        >
          {showToolbar && <Toolbar />}
          {error !== undefined && error !== null && error !== false && (
            <ErrorState error={error} retry={server.retry} />
          )}
          <div className="aits-body" data-loading={loading || undefined}>
            {content}
            {loading && hasRows && <LoadingOverlay skeleton={false} />}
          </div>
          {showPagination && <Pagination />}
          <LiveRegion message={liveMessage} />
        </ConditionalFormatProvider>
      </GridContext.Provider>
    </div>
  );
}
