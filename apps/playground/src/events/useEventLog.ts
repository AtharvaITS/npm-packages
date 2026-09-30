import { useCallback, useState } from 'react';

export interface EventLogEntry {
  id: number;
  time: string;
  eventName: string;
  payloadSummary: string;
}

export const MAX_EVENTS = 200;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** JSON summary safe for circular values, functions and bigints; max 200 characters. */
export function summarize(payload: unknown): string {
  const seen = new WeakSet<object>();
  let text: string;
  try {
    text =
      JSON.stringify(payload, (_key, value) => {
        if (typeof value === 'bigint') return value.toString() + 'n';
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
          if (typeof (value as Event).preventDefault === 'function' && 'nativeEvent' in value)
            return '[Event]';
        }
        return value;
      }) ?? String(payload);
  } catch {
    text = String(payload);
  }
  return text.length > 200 ? text.slice(0, 199) + '…' : text;
}

let nextId = 1;

export function useEventLog() {
  const [entries, setEntries] = useState<EventLogEntry[]>([]);
  const log = useCallback((eventName: string, payload?: unknown) => {
    const now = new Date();
    const entry: EventLogEntry = {
      id: nextId++,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      eventName,
      payloadSummary: payload === undefined ? '' : summarize(payload),
    };
    setEntries((prev) => [entry, ...prev].slice(0, MAX_EVENTS));
  }, []);
  const clear = useCallback(() => setEntries([]), []);
  return { entries, log, clear };
}
