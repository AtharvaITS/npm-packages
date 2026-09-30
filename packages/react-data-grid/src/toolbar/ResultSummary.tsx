import { useGrid } from '../state/GridContext';

/** "N results" + Clear all, shown while search or filters are active (FR-020). */
export function ResultSummary() {
  const ctx = useGrid();
  if (!ctx.hasActiveConditions) return null;
  return (
    <div className="aits-result-summary">
      <span className="aits-result-count">{ctx.messages.resultsCount(ctx.totalCount)}</span>
      <button type="button" className="aits-button aits-button-quiet" onClick={ctx.clearFilters}>
        {ctx.messages.clearAll}
      </button>
    </div>
  );
}
