import { useState, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from '../state/useIsomorphicLayoutEffect';

/**
 * Measures the rendered height of a sample item (first card row / list item)
 * so fixed-size virtualization matches the real layout. Falls back to an
 * estimate before measurement and on the server.
 */
export function useMeasuredItemSize(
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  fallback: number,
  deps: unknown[],
): number {
  const [size, setSize] = useState(fallback);
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(selector);
    const measured = el ? el.getBoundingClientRect().height : 0;
    const next = measured > 0 ? Math.round(measured) : fallback;
    if (next !== size) setSize(next);
  }, deps);
  return size;
}
