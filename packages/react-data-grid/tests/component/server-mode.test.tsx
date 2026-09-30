import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid, type DataPage, type DataRequest, type FetchDataOptions } from '../../src';

type Row = { id: string; name: string };
const page = (p: number, size = 25, total = 60): DataPage<Row> => ({
  rows: Array.from({ length: Math.min(size, total - p * size) }, (_, i) => ({
    id: `id${p * size + i}`,
    name: `Row ${p * size + i}`,
  })),
  totalCount: total,
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const firstName = () =>
  document.querySelector('.aits-tbody .aits-row .aits-cell:nth-child(2)')?.textContent;

describe('US4: host-managed data mode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requests on mount with the full DataRequest and paginates from totalCount', async () => {
    const fetchData = vi.fn(async (req: DataRequest, _opts: FetchDataOptions) => page(req.page));
    render(<ReactDataGrid<Row> dataMode="server" fetchData={fetchData} getRowId="id" />);
    await waitFor(() => expect(screen.getByText('1–25 of 60')).toBeInTheDocument());
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(fetchData.mock.calls[0]![0]).toEqual({
      requestId: 1,
      page: 0,
      pageSize: 25,
      sort: [],
      filters: [],
      search: '',
    });
    expect(fetchData.mock.calls[0]![1]!.signal).toBeInstanceOf(AbortSignal);
  });

  it('issues one request per change and aborts the previous one', async () => {
    const calls: {
      req: DataRequest;
      opts: FetchDataOptions;
      d: ReturnType<typeof deferred<DataPage<Row>>>;
    }[] = [];
    const fetchData = (req: DataRequest, opts: FetchDataOptions) => {
      const d = deferred<DataPage<Row>>();
      calls.push({ req, opts, d });
      return d.promise;
    };
    render(<ReactDataGrid<Row> dataMode="server" fetchData={fetchData} getRowId="id" />);
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0]!.d.resolve(page(0)));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.req.page).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[1]!.opts.signal.aborted).toBe(true);
    expect(calls[2]!.req).toMatchObject({
      page: 1,
      sort: [{ columnId: 'name', direction: 'asc' }],
    });
  });

  it('shows only the latest response when responses arrive out of order', async () => {
    const pending: ReturnType<typeof deferred<DataPage<Row>>>[] = [];
    const fetchData = () => {
      const d = deferred<DataPage<Row>>();
      pending.push(d);
      return d.promise;
    };
    render(<ReactDataGrid<Row> dataMode="server" fetchData={fetchData} getRowId="id" />);
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0]!.resolve(page(0)));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(pending).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(pending).toHaveLength(3));
    // Latest (page 2) resolves first, then the stale page 1 response.
    await act(async () => pending[2]!.resolve(page(2)));
    await act(async () => pending[1]!.resolve(page(1)));
    expect(firstName()).toBe('Row 50');
  });

  it('shows a loading indicator until data arrives', async () => {
    const d = deferred<DataPage<Row>>();
    render(<ReactDataGrid<Row> dataMode="server" fetchData={() => d.promise} getRowId="id" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await act(async () => d.resolve(page(0)));
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('keeps earlier rows visible under an error banner and retries with a new requestId', async () => {
    let n = 0;
    const fetchData = vi.fn(async (req: DataRequest) => {
      n++;
      if (n === 2) throw new Error('boom');
      return page(req.page);
    });
    render(<ReactDataGrid<Row> dataMode="server" fetchData={fetchData} getRowId="id" />);
    await waitFor(() => expect(firstName()).toBe('Row 0'));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('Something went wrong while loading data.')).toBeInTheDocument();
    expect(firstName()).toBe('Row 0');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(firstName()).toBe('Row 25'));
    expect(fetchData.mock.calls[2]![0].requestId).toBeGreaterThan(
      fetchData.mock.calls[1]![0].requestId,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('unmounting during a pending request produces no warnings or errors', async () => {
    const err = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    const d = deferred<DataPage<Row>>();
    let signal: AbortSignal | undefined;
    const { unmount } = render(
      <ReactDataGrid<Row>
        dataMode="server"
        fetchData={(_r, o) => {
          signal = o.signal;
          return d.promise;
        }}
      />,
    );
    unmount();
    await act(async () => d.resolve(page(0)));
    expect(signal!.aborted).toBe(true);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('supports the host-driven form (onDataRequest + data + totalCount + loading + error)', async () => {
    const onDataRequest = vi.fn();
    const { rerender } = render(
      <ReactDataGrid<Row>
        dataMode="server"
        onDataRequest={onDataRequest}
        data={page(0).rows}
        totalCount={60}
        loading={false}
      />,
    );
    expect(onDataRequest).toHaveBeenCalledWith(expect.objectContaining({ page: 0, pageSize: 25 }));
    expect(screen.getByText('1–25 of 60')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onDataRequest).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    rerender(
      <ReactDataGrid<Row>
        dataMode="server"
        onDataRequest={onDataRequest}
        data={page(0).rows}
        totalCount={60}
        loading
      />,
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    rerender(
      <ReactDataGrid<Row>
        dataMode="server"
        onDataRequest={onDataRequest}
        data={page(1).rows}
        totalCount={60}
        error={new Error('x')}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(firstName()).toBe('Row 25');
  });

  it('warns when both fetchData and onDataRequest are supplied', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ReactDataGrid dataMode="server" fetchData={async () => page(0)} onDataRequest={() => {}} />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Both fetchData and onDataRequest'));
  });
});
