import type { ColumnStateItem, SortItem, ViewType } from '../types';

/** What preference-saving stores (data model §11). Selection, search, filters and page are never saved. */
export interface PersistedState {
  view?: ViewType;
  sort?: SortItem[];
  pageSize?: number;
  columns?: ColumnStateItem[];
}

export const STORAGE_PREFIX = '@atharvaits/react-data-grid:';
const VERSION = 1;

/** In-memory fallback when browser storage is unavailable or full. */
const memory = new Map<string, string>();

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

function readRaw(key: string): string | null {
  const storage = getStorage();
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value !== null) return value;
    } catch {
      // fall through to memory
    }
  }
  return memory.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      memory.delete(key);
      return;
    } catch {
      // quota exceeded or blocked: keep in memory only
    }
  }
  memory.set(key, value);
}

export function clearPersisted(persistKey: string): void {
  const key = STORAGE_PREFIX + persistKey;
  memory.delete(key);
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

const VIEWS: ViewType[] = ['table', 'grid', 'list'];

function isSortItem(x: unknown): x is SortItem {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as SortItem).columnId === 'string' &&
    ((x as SortItem).direction === 'asc' || (x as SortItem).direction === 'desc')
  );
}

/**
 * Reads and validates saved preferences. Unknown versions are discarded;
 * unknown columns and disallowed views are ignored (US7 scenario 5).
 */
export function readPersisted(
  persistKey: string,
  context: { columnIds: readonly string[]; views: readonly ViewType[] },
): PersistedState | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = readRaw(STORAGE_PREFIX + persistKey);
  if (!raw) return undefined;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || parsed.v !== VERSION) return undefined;

  const ids = new Set(context.columnIds);
  const result: PersistedState = {};
  if (VIEWS.includes(parsed.view) && context.views.includes(parsed.view)) result.view = parsed.view;
  if (Array.isArray(parsed.sort)) {
    result.sort = parsed.sort.filter((s: unknown) => isSortItem(s) && ids.has(s.columnId));
  }
  if (
    typeof parsed.pageSize === 'number' &&
    parsed.pageSize > 0 &&
    Number.isFinite(parsed.pageSize)
  ) {
    result.pageSize = Math.floor(parsed.pageSize);
  }
  if (Array.isArray(parsed.columns)) {
    result.columns = parsed.columns
      .filter((c: any) => c && typeof c.id === 'string' && ids.has(c.id))
      .map((c: any) => {
        const item: ColumnStateItem = {
          id: c.id,
          order: typeof c.order === 'number' ? c.order : 0,
        };
        if (typeof c.width === 'number' && Number.isFinite(c.width)) item.width = c.width;
        if (typeof c.hidden === 'boolean') item.hidden = c.hidden;
        if (c.pinned === 'start' || c.pinned === 'end' || c.pinned === null) item.pinned = c.pinned;
        return item;
      });
  }
  return result;
}

export function writePersisted(persistKey: string, state: Required<PersistedState>): void {
  if (typeof window === 'undefined') return;
  const payload = {
    v: VERSION,
    view: state.view,
    sort: state.sort,
    pageSize: state.pageSize,
    columns: state.columns,
  };
  try {
    writeRaw(STORAGE_PREFIX + persistKey, JSON.stringify(payload));
  } catch {
    // never throw from persistence
  }
}

/** Debounced writer (300 ms). */
export function createPersister(delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { key: string; state: Required<PersistedState> } | undefined;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (pending) writePersisted(pending.key, pending.state);
    pending = undefined;
  };
  return {
    schedule(key: string, state: Required<PersistedState>) {
      pending = { key, state };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    flush,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pending = undefined;
    },
  };
}
