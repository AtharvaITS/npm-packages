import { useState, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from '../state/useIsomorphicLayoutEffect';

export interface ElementSize {
  width: number;
  height: number;
}

const ZERO: ElementSize = { width: 0, height: 0 };

/** Size of an element via ResizeObserver. Server-safe: returns 0×0 without an observer. */
export function useElementSize(ref: RefObject<HTMLElement | null>, enabled = true): ElementSize {
  const [size, setSize] = useState<ElementSize>(ZERO);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof ResizeObserver === 'undefined') return;
    const update = (width: number, height: number) => {
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    const rect = el.getBoundingClientRect();
    if (rect.width || rect.height) update(rect.width, rect.height);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return size;
}
