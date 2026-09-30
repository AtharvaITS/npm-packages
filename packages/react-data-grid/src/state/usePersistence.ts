import { useEffect, useMemo, useRef } from 'react';
import { createPersister, readPersisted } from '../core/persist';
import type { GridStateApi } from './useGridState';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

/**
 * Preference saving (FR-039, research R13). Restores once per key after mount
 * (never during server rendering, so hydration matches) and saves changes to
 * view, sort, page size and column layout, debounced by 300 ms.
 */
export function usePersistence(
  persistKey: string | undefined,
  api: GridStateApi,
  columnIds: readonly string[],
): void {
  const restoredKey = useRef<string | undefined>(undefined);
  const persister = useMemo(() => createPersister(300), []);
  const { view, sort, pageSize, columnState } = api.state;
  const hasColumns = columnIds.length > 0;

  useIsomorphicLayoutEffect(() => {
    if (!persistKey || restoredKey.current === persistKey || !hasColumns) return;
    restoredKey.current = persistKey;
    const saved = readPersisted(persistKey, { columnIds, views: api.views });
    if (saved) api.restore(saved);
    // Restore once per key, as soon as columns are known.
  }, [persistKey, hasColumns]);

  useEffect(() => {
    if (!persistKey || restoredKey.current !== persistKey) return;
    persister.schedule(persistKey, { view, sort, pageSize, columns: columnState });
  }, [persistKey, persister, view, sort, pageSize, columnState]);

  useEffect(() => () => persister.flush(), [persister]);
}
