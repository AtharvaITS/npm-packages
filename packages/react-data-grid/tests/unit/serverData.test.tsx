import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useServerData } from '../../src/state/useServerData';
import type { DataPage, DataRequest, FetchDataOptions } from '../../src/types';

type Row = { id: number };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const query = (page: number) => ({
  page,
  pageSize: 10,
  sort: [],
  filters: [],
  search: '',
});

describe('useServerData', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes host loading and error through in client mode', async () => {
    const fetchData = vi.fn();
    const onRetry = vi.fn();
    const { result } = renderHook(() =>
      useServerData<Row>(
        { dataMode: 'client', loading: true, error: 'down', onRetry, fetchData },
        query(0),
        {},
      ),
    );
    await act(async () => {});
    expect(fetchData).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      rows: undefined,
      totalCount: undefined,
      loading: true,
      error: 'down',
    });
    act(() => result.current.retry());
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('loads a page and ignores a stale response', async () => {
    const pending: ReturnType<typeof deferred<DataPage<Row>>>[] = [];
    const fetchData = vi.fn((_req: DataRequest, _opts: FetchDataOptions) => {
      const next = deferred<DataPage<Row>>();
      pending.push(next);
      return next.promise;
    });
    const { result, rerender } = renderHook(
      ({ page }) => useServerData<Row>({ dataMode: 'server', fetchData }, query(page), {}),
      { initialProps: { page: 0 } },
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(fetchData.mock.calls[0]![0]).toMatchObject({ requestId: 1, page: 0, pageSize: 10 });
    expect(fetchData.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);

    rerender({ page: 1 });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0]!.promise).toBeTruthy();
    expect(fetchData.mock.calls[0]![1].signal.aborted).toBe(true);

    await act(async () => pending[1]!.resolve({ rows: [{ id: 2 }], totalCount: 8 }));
    await act(async () => pending[0]!.resolve({ rows: [{ id: 1 }], totalCount: 8 }));
    expect(result.current.rows).toEqual([{ id: 2 }]);
    expect(result.current.totalCount).toBe(8);
    expect(result.current.loading).toBe(false);
  });

  it('normalizes a bad page and surfaces a failed request that can be retried', async () => {
    const first = deferred<DataPage<Row>>();
    const fetchData = vi.fn(() => first.promise);
    const { result } = renderHook(() =>
      useServerData<Row>({ dataMode: 'server', fetchData }, query(0), {}),
    );
    await waitFor(() => expect(fetchData).toHaveBeenCalledOnce());
    await act(async () => first.resolve({ rows: null as unknown as Row[], totalCount: 5 }));
    expect(result.current.rows).toEqual([]);
    expect(result.current.totalCount).toBe(5);

    const { result: failed } = renderHook(() =>
      useServerData<Row>(
        {
          dataMode: 'server',
          fetchData: vi.fn(async () => {
            throw new Error('nope');
          }),
        },
        query(0),
        {},
      ),
    );
    await waitFor(() => expect(failed.current.loading).toBe(false));
    expect(failed.current.error).toEqual(expect.any(Error));

    const sequenced = [deferred<DataPage<Row>>(), deferred<DataPage<Row>>()];
    const retryable = vi.fn((..._args: [DataRequest, FetchDataOptions]) => {
      return sequenced[retryable.mock.calls.length - 1]!.promise;
    });
    const retried = renderHook(() =>
      useServerData<Row>({ dataMode: 'server', fetchData: retryable }, query(0), {}),
    );
    await waitFor(() => expect(retryable).toHaveBeenCalledOnce());
    await act(async () => sequenced[0]!.reject(new Error('timeout')));
    await waitFor(() => expect(retried.result.current.error).toEqual(expect.any(Error)));
    act(() => retried.result.current.retry());
    await waitFor(() => expect(retryable).toHaveBeenCalledTimes(2));
    expect(retryable.mock.calls[1]?.[0]?.requestId).toBe(2);
    await act(async () => sequenced[1]!.resolve({ rows: [{ id: 9 }], totalCount: 1 }));
    await waitFor(() => expect(retried.result.current.rows).toEqual([{ id: 9 }]));
  });

  it('ignores abort errors and aborts on unmount', async () => {
    const pending = deferred<DataPage<Row>>();
    let signal: AbortSignal | undefined;
    const fetchData = vi.fn((_req: DataRequest, opts: FetchDataOptions) => {
      signal = opts.signal;
      return pending.promise;
    });
    const { result, unmount } = renderHook(() =>
      useServerData<Row>({ dataMode: 'server', fetchData }, query(0), {}),
    );
    await waitFor(() => expect(fetchData).toHaveBeenCalledOnce());
    await act(async () => pending.reject({ name: 'AbortError' }));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeUndefined();
    unmount();
    expect(signal!.aborted).toBe(true);
  });

  it('treats a total smaller than the page as the page length', async () => {
    const fetchData = vi.fn(async () => ({ rows: [{ id: 1 }, { id: 2 }], totalCount: 1 }));
    const { result } = renderHook(() =>
      useServerData<Row>({ dataMode: 'server', fetchData }, query(0), {}),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalCount).toBe(2);
  });

  it('warns and prefers fetchData when both server callbacks are set', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchData = vi.fn(async () => ({ rows: [{ id: 1 }], totalCount: 1 }));
    const onDataRequest = vi.fn();
    renderHook(() =>
      useServerData<Row>({ dataMode: 'server', fetchData, onDataRequest }, query(0), {}),
    );
    await waitFor(() => expect(fetchData).toHaveBeenCalled());
    expect(onDataRequest).not.toHaveBeenCalled();
    expect(warn.mock.calls[0]![0]).toContain('fetchData is used');
  });

  it('warns when server mode has no data callback', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderHook(() => useServerData<Row>({ dataMode: 'server' }, query(0), {}));
    expect(warn.mock.calls[0]![0]).toContain('needs fetchData or onDataRequest');
  });

  it('asks the host for data and retries through the host callback', async () => {
    const onDataRequest = vi.fn();
    const onRetry = vi.fn();
    const { result, rerender } = renderHook(
      ({ page }) =>
        useServerData<Row>(
          { dataMode: 'server', onDataRequest, onRetry, totalCount: 40, loading: false },
          query(page),
          {},
        ),
      { initialProps: { page: 0 } },
    );
    await waitFor(() => expect(onDataRequest).toHaveBeenCalledOnce());
    expect(onDataRequest.mock.calls[0]![0]).toMatchObject({ requestId: 1, page: 0 });
    expect(result.current).toMatchObject({ rows: undefined, totalCount: 40, loading: false });
    act(() => result.current.retry());
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDataRequest).toHaveBeenCalledOnce();

    rerender({ page: 2 });
    await waitFor(() => expect(onDataRequest).toHaveBeenCalledTimes(2));
    expect(onDataRequest.mock.calls[1]![0].page).toBe(2);
  });

  it('re-issues the host request when retry has no host handler', async () => {
    const onDataRequest = vi.fn();
    const { result } = renderHook(() =>
      useServerData<Row>({ dataMode: 'server', onDataRequest }, query(0), {}),
    );
    await waitFor(() => expect(onDataRequest).toHaveBeenCalledOnce());
    act(() => result.current.retry());
    await waitFor(() => expect(onDataRequest).toHaveBeenCalledTimes(2));
    expect(onDataRequest.mock.calls[1]![0].requestId).not.toBe(1);
  });
});
