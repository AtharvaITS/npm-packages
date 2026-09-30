import { useGrid } from '../state/GridContext';
import { renderStateContent } from './States';

/** Loading indicator over the current rows; skeleton rows when nothing is loaded yet. */
export function LoadingOverlay({ skeleton }: { skeleton: boolean }) {
  const ctx = useGrid();
  const content = renderStateContent(
    ctx.props.loadingContent,
    { messages: ctx.messages },
    <span className="aits-loading-label">
      <span className="aits-spinner" aria-hidden="true" />
      {ctx.messages.loading}
    </span>,
  );
  if (skeleton) {
    return (
      <div className="aits-skeleton" data-state="loading">
        <div className="aits-loading-inline">{content}</div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="aits-skeleton-row" aria-hidden="true" />
        ))}
      </div>
    );
  }
  return (
    <div className="aits-loading-overlay" data-state="loading">
      {content}
    </div>
  );
}
