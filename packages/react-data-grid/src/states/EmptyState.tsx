import { useGrid } from '../state/GridContext';
import { renderStateContent } from './States';

/** Shown when there is no data at all (US1 scenario 3). */
export function EmptyState() {
  const ctx = useGrid();
  return (
    <div className="aits-empty" data-state="empty">
      {renderStateContent(
        ctx.props.emptyContent,
        { messages: ctx.messages },
        <p>{ctx.messages.empty}</p>,
      )}
    </div>
  );
}
