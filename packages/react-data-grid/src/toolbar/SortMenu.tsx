import { useId } from 'react';
import { useGrid } from '../state/GridContext';
import { SortAscIcon, SortDescIcon } from '../views/icons';

/** Sort control for grid and list views; shares the same sort state as table headers. */
export function SortMenu() {
  const ctx = useGrid();
  const { api, messages } = ctx;
  const id = useId();
  const sortable = ctx.visibleColumns.filter((c) => c.sortable);
  if (sortable.length === 0) return null;
  const current = api.state.sort[0];
  const direction = current?.direction ?? 'asc';

  return (
    <div className="aits-sort-menu">
      <label className="aits-visually-hidden" htmlFor={id}>
        {messages.sortBy}
      </label>
      <select
        id={id}
        className="aits-input"
        value={current?.columnId ?? ''}
        onChange={(e) => {
          const columnId = e.target.value;
          api.setSort(columnId ? [{ columnId, direction }] : []);
        }}
      >
        <option value="">{messages.sortBy}…</option>
        {sortable.map((c) => (
          <option key={c.id} value={c.id}>
            {c.header}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="aits-icon-button"
        disabled={!current}
        aria-label={direction === 'asc' ? messages.sortAscending : messages.sortDescending}
        aria-pressed={current ? direction === 'desc' : undefined}
        onClick={() =>
          current &&
          api.setSort([
            { columnId: current.columnId, direction: direction === 'asc' ? 'desc' : 'asc' },
          ])
        }
      >
        {direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
      </button>
    </div>
  );
}
