import { useCallback, useEffect, useRef, useState } from 'react';
import { warn } from '../dev/warn';
import type { ReactDataGridProps, DataRequest, FilterCondition, SortItem } from '../types';

export interface ServerDataState<TRow> {
  /** Rows of the current page (fetchData form) or undefined (host-driven form). */
  rows: TRow[] | undefined;
  totalCount: number | undefined;
  loading: boolean;
  error: unknown;
  retry(): void;
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    ((err as { name?: string }).name === 'AbortError' || (err as { code?: number }).code === 20)
  );
}

/**
 * Host-managed data mode (API contract §5):
 * 1. requests on mount and on every page/pageSize/sort/filters/search change
 * 2. a new request aborts the previous signal
 * 3. only the latest request's result is applied
 * 4. non-abort rejections produce an error state with retry
 * 5. unmount aborts and ignores late results
 */
export function useServerData<TRow>(
  props: ReactDataGridProps<TRow>,
  query: {
    page: number;
    pageSize: number;
    sort: SortItem[];
    filters: FilterCondition[];
    search: string;
  },
  warnKey: object,
): ServerDataState<TRow> {
  const enabled = props.dataMode === 'server';
  const { fetchData, onDataRequest } = props;
  if (enabled && fetchData && onDataRequest) {
    warn(warnKey, 'Both fetchData and onDataRequest were supplied; fetchData is used.');
  }
  if (enabled && !fetchData && !onDataRequest) {
    warn(warnKey, 'dataMode="server" needs fetchData or onDataRequest.');
  }

  const fetchRef = useRef(fetchData);
  fetchRef.current = fetchData;
  const requestRef = useRef(onDataRequest);
  requestRef.current = onDataRequest;

  const latestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{ rows: TRow[]; totalCount: number } | undefined>(undefined);
  const [status, setStatus] = useState<{ loading: boolean; error: unknown }>(() => ({
    loading: enabled && !!fetchData,
    error: undefined,
  }));
  const [attempt, setAttempt] = useState(0);

  const key = enabled ? JSON.stringify(query) : '';

  useEffect(() => {
    if (!enabled) return;
    const id = ++latestId.current;
    const request: DataRequest = { requestId: id, ...query };
    const fetcher = fetchRef.current;
    if (fetcher) {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus((s) =>
        s.loading && s.error === undefined ? s : { loading: true, error: undefined },
      );
      Promise.resolve()
        .then(() => fetcher(request, { signal: controller.signal }))
        .then(
          (page) => {
            if (id !== latestId.current || controller.signal.aborted) return;
            const rows = Array.isArray(page?.rows) ? page.rows : [];
            const totalCount =
              typeof page?.totalCount === 'number' && page.totalCount >= rows.length
                ? page.totalCount
                : rows.length;
            setResult({ rows, totalCount });
            setStatus({ loading: false, error: undefined });
          },
          (err) => {
            if (id !== latestId.current || controller.signal.aborted || isAbortError(err)) return;
            setStatus({ loading: false, error: err ?? new Error('Request failed') });
          },
        );
    } else {
      requestRef.current?.(request);
    }
    // `query` is captured through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, attempt]);

  useEffect(
    () => () => {
      latestId.current++;
      controllerRef.current?.abort();
    },
    [],
  );

  const onRetry = props.onRetry;
  const hasFetch = !!fetchData;
  const retry = useCallback(() => {
    onRetry?.();
    // Re-issue the last request (with a new requestId) unless the host handles retry itself.
    if (hasFetch || !onRetry) setAttempt((n) => n + 1);
  }, [onRetry, hasFetch]);

  if (!enabled) {
    return {
      rows: undefined,
      totalCount: undefined,
      loading: !!props.loading,
      error: props.error,
      retry,
    };
  }
  if (fetchData) {
    return {
      rows: result?.rows ?? [],
      totalCount: result?.totalCount ?? 0,
      loading: status.loading,
      error: status.error,
      retry,
    };
  }
  return {
    rows: undefined,
    totalCount: props.totalCount,
    loading: !!props.loading,
    error: props.error,
    retry,
  };
}
