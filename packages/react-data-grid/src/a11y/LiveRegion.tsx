import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Polite live region (FR-042). `announce` is debounced by 150 ms so rapid
 * changes produce one announcement.
 */
export function useAnnouncer(delay = 150) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const announce = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        // Toggle through empty so identical consecutive messages are re-read.
        setMessage((prev) => (prev === text ? text + ' ' : text));
      }, delay);
    },
    [delay],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, announce };
}

export function LiveRegion({ message }: { message: string }) {
  return (
    <div className="aits-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
