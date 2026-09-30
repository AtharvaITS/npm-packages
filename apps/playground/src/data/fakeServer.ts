import type {
  DataPage,
  DataRequest,
  FetchDataOptions,
  FilterCondition,
} from '@atharvaits/react-data-grid';
import type { Employee } from './sample-50';

/**
 * A pretend backend over the 50 sample records, used by the `server-mode`
 * scenario. It deliberately re-implements search/filter/sort/paging here instead
 * of importing the package's internals (the Playground only uses the public API).
 */

export interface FakeServerOptions {
  delayMs: number;
  failEvery5th: boolean;
  randomizeOrder: boolean;
  onRequest?(req: DataRequest): void;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function get(row: Employee, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined),
      row,
    );
}

function matches(row: Employee, f: FilterCondition): boolean {
  const v = get(row, f.columnId);
  const empty = v === null || v === undefined || v === '';
  switch (f.operator) {
    case 'isEmpty':
      return empty;
    case 'isNotEmpty':
      return !empty;
    case 'isTrue':
      return v === true;
    case 'isFalse':
      return v === false;
  }
  if (f.value === undefined || f.value === '' || f.value === null) return true;
  if (
    v instanceof Date ||
    f.operator === 'before' ||
    f.operator === 'after' ||
    f.operator === 'on'
  ) {
    const t =
      v instanceof Date ? new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime() : NaN;
    const a = new Date(String(f.value) + 'T00:00:00').getTime();
    const b = f.value2 ? new Date(String(f.value2) + 'T00:00:00').getTime() : NaN;
    if (f.operator === 'before') return t < a;
    if (f.operator === 'after') return t > a;
    if (f.operator === 'on') return t === a;
    if (f.operator === 'between') return t >= Math.min(a, b) && t <= Math.max(a, b);
    return true;
  }
  if (typeof v === 'number') {
    const a = Number(f.value);
    const b = Number(f.value2);
    switch (f.operator) {
      case 'eq':
        return v === a;
      case 'neq':
        return v !== a;
      case 'lt':
        return v < a;
      case 'lte':
        return v <= a;
      case 'gt':
        return v > a;
      case 'gte':
        return v >= a;
      case 'between':
        return v >= Math.min(a, b) && v <= Math.max(a, b);
    }
    return true;
  }
  const text = fold(String(v ?? ''));
  if (f.operator === 'in')
    return (Array.isArray(f.value) ? f.value : [f.value]).some((x) => fold(String(x)) === text);
  const needle = fold(String(f.value));
  switch (f.operator) {
    case 'contains':
      return text.includes(needle);
    case 'equals':
      return text === needle;
    case 'startsWith':
      return text.startsWith(needle);
    case 'endsWith':
      return text.endsWith(needle);
  }
  return true;
}

function compare(a: unknown, b: unknown): number {
  const ea = a === null || a === undefined || a === '';
  const eb = b === null || b === undefined || b === '';
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function createFakeServer(rows: readonly Employee[], options: () => FakeServerOptions) {
  let count = 0;
  return function fetchData(
    req: DataRequest,
    { signal }: FetchDataOptions,
  ): Promise<DataPage<Employee>> {
    const opts = options();
    opts.onRequest?.(req);
    count++;
    const shouldFail = opts.failEvery5th && count % 5 === 0;
    const delay = opts.randomizeOrder ? 100 + Math.floor(Math.random() * 1100) : opts.delayMs;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (shouldFail) {
          reject(new Error(`Simulated failure on request #${count}`));
          return;
        }
        const needle = fold(req.search.trim());
        let result = rows.filter((row) => {
          if (needle) {
            const hay = fold(
              [
                row.name,
                row.email,
                row.role,
                row.department,
                row.address.city,
                row.address.country,
              ].join(' '),
            );
            if (!hay.includes(needle)) return false;
          }
          return req.filters.every((f) => matches(row, f));
        });
        for (const s of [...req.sort].reverse()) {
          const dir = s.direction === 'desc' ? -1 : 1;
          result = [...result].sort((a, b) => {
            const va = get(a, s.columnId);
            const vb = get(b, s.columnId);
            const ea = va === null || va === undefined || va === '';
            const eb = vb === null || vb === undefined || vb === '';
            if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
            return compare(va, vb) * dir;
          });
        }
        const start = req.page * req.pageSize;
        resolve({ rows: result.slice(start, start + req.pageSize), totalCount: result.length });
      }, delay);
      // With "randomize response order" the server ignores cancellation, so late
      // responses really do arrive out of order and the grid must discard them.
      if (!opts.randomizeOrder) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    });
  };
}
