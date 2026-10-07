import { useEffect, useMemo, useRef } from 'react';
import { createPersister, readPersisted } from '../core/persist';
import type { ConditionalFormatRule, HeaderStyle } from '../types';
import type { SetState } from './useControllableState';
import type { GridStateApi } from './useGridState';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

/** Formatting state saved beside view, sort, page size and column layout. */
export interface FormatPersistence {
  rules: ConditionalFormatRule[];
  setRules: SetState<ConditionalFormatRule[]>;
  rulesControlled: boolean;
  headerStyle: HeaderStyle;
  setHeaderStyle: SetState<HeaderStyle>;
  headerStyleControlled: boolean;
}

/**
 * Preference saving (FR-039, research R13). Restores once per key after mount
 * (never during server rendering, so hydration matches) and saves changes to
 * view, sort, page size, column layout, formatting rules and header style,
 * debounced by 300 ms.
 */
export function usePersistence(
  persistKey: string | undefined,
  api: GridStateApi,
  columnIds: readonly string[],
  format: FormatPersistence,
): void {
  const restoredKey = useRef<string | undefined>(undefined);
  const persister = useMemo(() => createPersister(300), []);
  const { view, sort, pageSize, columnState } = api.state;
  const { rules, headerStyle } = format;
  const hasColumns = columnIds.length > 0;
  const latest = useRef({ view, sort, pageSize, columnState, rules, headerStyle });
  latest.current = { view, sort, pageSize, columnState, rules, headerStyle };

  useIsomorphicLayoutEffect(() => {
    if (!persistKey || restoredKey.current === persistKey || !hasColumns) return;
    restoredKey.current = persistKey;
    const saved = readPersisted(persistKey, { columnIds, views: api.views });
    if (!saved) return;
    api.restore(saved);
    if (saved.formatRules !== undefined && !format.rulesControlled) {
      format.setRules(saved.formatRules, { silent: true });
    }
    if (saved.headerStyle !== undefined && !format.headerStyleControlled) {
      format.setHeaderStyle(saved.headerStyle, { silent: true });
    }
    // Restore once per key, as soon as columns are known.
  }, [persistKey, hasColumns]);

  useEffect(() => {
    if (!persistKey || restoredKey.current !== persistKey) return;
    const current = latest.current;
    persister.schedule(persistKey, {
      view: current.view,
      sort: current.sort,
      pageSize: current.pageSize,
      columns: current.columnState,
      formatRules: current.rules,
      headerStyle: current.headerStyle,
    });
  }, [persistKey, persister, view, sort, pageSize, columnState, rules, headerStyle]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flush = () => persister.flush();
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      persister.flush();
    };
  }, [persister]);
}
