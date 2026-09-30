export function pageCount(total: number, size: number): number {
  if (!(size > 0)) return 1;
  return Math.max(1, Math.ceil(total / size));
}

export function clampPage(page: number, total: number, size: number): number {
  const max = pageCount(total, size) - 1;
  if (!Number.isFinite(page) || page < 0) return 0;
  return Math.min(Math.floor(page), max);
}

export function pageSlice<T>(items: readonly T[], page: number, size: number): T[] {
  const start = page * size;
  return items.slice(start, start + size);
}

/** 1-based inclusive range; `from` is 0 when there are no records. */
export function pageRange(page: number, size: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return { from, to };
}

/** Page that keeps the first previously visible record on screen after a page-size change. */
export function pageForFirstVisible(firstIndex: number, newSize: number): number {
  if (!(newSize > 0) || firstIndex < 0) return 0;
  return Math.floor(firstIndex / newSize);
}
