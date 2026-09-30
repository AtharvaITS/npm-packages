import { useId } from 'react';
import { pageCount, pageRange } from '../core/paginate';
import { useGrid } from '../state/GridContext';
import { DEFAULT_PAGE_SIZE_OPTIONS } from '../state/useGridState';
import { ChevronIcon } from '../views/icons';

/** Page navigation + page size (FR-022). */
export function Pagination() {
  const ctx = useGrid();
  const { api, messages, totalCount } = ctx;
  const { page, pageSize } = api.state;
  const id = useId();
  const pages = pageCount(totalCount, pageSize);
  const current = Math.min(page, pages - 1);
  const { from, to } = pageRange(current, pageSize, totalCount);
  const options = Array.from(
    new Set([...(ctx.props.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS), pageSize]),
  ).sort((a, b) => a - b);
  const atStart = current <= 0;
  const atEnd = current >= pages - 1;

  return (
    <nav className="aits-pagination" aria-label={messages.pageStatus(current + 1, pages)}>
      <div className="aits-page-size">
        <label htmlFor={id}>{messages.rowsPerPage}</label>
        <select
          id={id}
          className="aits-input"
          value={pageSize}
          onChange={(e) => api.setPageSize(Number(e.target.value), current * pageSize)}
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <span className="aits-page-range">{messages.pageRange(from, to, totalCount)}</span>
      <div className="aits-page-buttons">
        <button
          type="button"
          className="aits-icon-button"
          aria-label={messages.firstPage}
          disabled={atStart}
          onClick={() => api.setPage(0)}
        >
          <ChevronIcon dir="first" />
        </button>
        <button
          type="button"
          className="aits-icon-button"
          aria-label={messages.previousPage}
          disabled={atStart}
          onClick={() => api.setPage(current - 1)}
        >
          <ChevronIcon dir="prev" />
        </button>
        <span className="aits-page-status">{messages.pageStatus(current + 1, pages)}</span>
        <button
          type="button"
          className="aits-icon-button"
          aria-label={messages.nextPage}
          disabled={atEnd}
          onClick={() => api.setPage(current + 1)}
        >
          <ChevronIcon dir="next" />
        </button>
        <button
          type="button"
          className="aits-icon-button"
          aria-label={messages.lastPage}
          disabled={atEnd}
          onClick={() => api.setPage(pages - 1)}
        >
          <ChevronIcon dir="last" />
        </button>
      </div>
    </nav>
  );
}
