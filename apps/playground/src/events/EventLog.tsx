import type { EventLogEntry } from './useEventLog';
import { MAX_EVENTS } from './useEventLog';

export function EventLog({ entries, onClear }: { entries: EventLogEntry[]; onClear(): void }) {
  return (
    <section className="pg-events" aria-labelledby="pg-events-title">
      <header className="pg-section-header">
        <h2 id="pg-events-title">
          Event log <span className="pg-muted">(latest {MAX_EVENTS})</span>
        </h2>
        <button
          type="button"
          className="pg-button"
          onClick={onClear}
          disabled={entries.length === 0}
        >
          Clear
        </button>
      </header>
      <ol className="pg-event-list" data-testid="event-log">
        {entries.length === 0 && (
          <li className="pg-muted">No events yet. Interact with the grid.</li>
        )}
        {entries.map((e) => (
          <li key={e.id} data-event={e.eventName}>
            <time>{e.time}</time> <strong>{e.eventName}</strong> <code>{e.payloadSummary}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}
