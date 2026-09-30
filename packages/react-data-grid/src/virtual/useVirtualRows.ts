import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useElementSize } from './useElementSize';

export interface VirtualRange {
  start: number;
  /** Exclusive. */
  end: number;
  offsetTop: number;
  totalSize: number;
}

/** Visible range for fixed-size items (research R6). Pure, for unit testing. */
export function computeRange(params: {
  count: number;
  itemSize: number;
  scrollTop: number;
  viewportHeight: number;
  overscan?: number;
  /** Space above the first item inside the scroll container (e.g. a sticky header). */
  headerOffset?: number;
}): VirtualRange {
  const { count, itemSize, scrollTop, viewportHeight } = params;
  const overscan = params.overscan ?? 5;
  const headerOffset = params.headerOffset ?? 0;
  const size = itemSize > 0 ? itemSize : 1;
  const totalSize = count * size;
  if (count <= 0) return { start: 0, end: 0, offsetTop: 0, totalSize: 0 };
  const top = Math.max(0, scrollTop - headerOffset);
  const firstVisible = Math.min(count - 1, Math.floor(top / size));
  const visibleCount = Math.ceil(Math.max(viewportHeight, size) / size) + 1;
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(count, firstVisible + visibleCount + overscan);
  return { start, end, offsetTop: start * size, totalSize };
}

export interface UseVirtualRowsOptions {
  count: number;
  itemSize: number;
  scrollRef: RefObject<HTMLElement | null>;
  overscan?: number;
  enabled?: boolean;
  headerOffset?: number;
  /** Items rendered on the server / before measurement. */
  initialCount?: number;
}

export function useVirtualRows(options: UseVirtualRowsOptions): VirtualRange & {
  scrollToIndex(index: number): void;
} {
  const { count, itemSize, scrollRef, overscan = 5, enabled = true, headerOffset = 0 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const viewport = useElementSize(scrollRef, enabled);
  const frame = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!enabled || !el) return;
    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setScrollTop(el.scrollTop);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [scrollRef, enabled]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const top = headerOffset + index * itemSize;
      const bottom = top + itemSize;
      const viewTop = el.scrollTop + headerOffset;
      const viewBottom = el.scrollTop + el.clientHeight;
      if (top < viewTop) el.scrollTop = top - headerOffset;
      else if (bottom > viewBottom) el.scrollTop = bottom - el.clientHeight;
      setScrollTop(el.scrollTop);
    },
    [scrollRef, itemSize, headerOffset],
  );

  if (!enabled) {
    return { start: 0, end: count, offsetTop: 0, totalSize: count * itemSize, scrollToIndex };
  }
  if (viewport.height === 0) {
    // Server render / before measurement: render the first items only.
    const end = Math.min(count, options.initialCount ?? 50);
    return { start: 0, end, offsetTop: 0, totalSize: count * itemSize, scrollToIndex };
  }
  const range = computeRange({
    count,
    itemSize,
    scrollTop,
    viewportHeight: viewport.height,
    overscan,
    headerOffset,
  });
  return { ...range, scrollToIndex };
}
