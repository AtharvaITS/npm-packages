import { useGrid } from '../state/GridContext';
import { renderStateContent } from './States';

/** Error banner with Retry, shown above any rows that are still visible (FR-025). */
export function ErrorState({ error, retry }: { error: unknown; retry(): void }) {
  const ctx = useGrid();
  return (
    <div className="aits-error" role="alert" data-state="error">
      {renderStateContent(
        ctx.props.errorContent,
        { messages: ctx.messages, retry, error },
        <>
          <span>{ctx.messages.error}</span>
          <button type="button" className="aits-button" onClick={retry}>
            {ctx.messages.retry}
          </button>
        </>,
      )}
    </div>
  );
}
