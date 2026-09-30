import { useGrid } from '../state/GridContext';
import { renderStateContent } from './States';

/** Data exists but search/filters match nothing: distinct from EmptyState. */
export function NoResultsState() {
  const ctx = useGrid();
  return (
    <div className="aits-empty" data-state="no-results">
      {renderStateContent(
        ctx.props.noResultsContent,
        { messages: ctx.messages, clearFilters: ctx.clearFilters },
        <>
          <p>{ctx.messages.noResults}</p>
          <button type="button" className="aits-button" onClick={ctx.clearFilters}>
            {ctx.messages.clearAll}
          </button>
        </>,
      )}
    </div>
  );
}
