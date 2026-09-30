import { useCallback, useState } from 'react';
import type { ColorScheme, Density, SelectionMode, ViewType } from '@atharvaits/react-data-grid';

/**
 * Everything the settings panel controls. Kept in memory only, so a page
 * reload always returns to these defaults (US9 scenario 5).
 */
export interface Settings {
  // View
  defaultView: ViewType;
  views: ViewType[];
  showViewSwitcher: boolean;
  titleField: string;
  subtitleField: string;
  imageField: string;
  cardMinWidth: number;
  cardFieldLimit: number;
  // Sort / filter / search
  multiSort: boolean;
  searchable: boolean;
  filterable: boolean;
  searchDebounceMs: number;
  columnFlagsTarget: string;
  columnFlags: Record<string, { sortable: boolean; filterable: boolean; searchable: boolean }>;
  // Paging
  pagination: 'pages' | 'scroll';
  defaultPageSize: number;
  pageSizeOptions: string;
  height: number;
  // Selection
  selectionMode: SelectionMode;
  every7thUnselectable: boolean;
  controlledSelection: boolean;
  // Columns
  useCustomColumns: boolean;
  customStatusBadge: boolean;
  customCard: boolean;
  customListItem: boolean;
  enableColumnResize: boolean;
  enableColumnReorder: boolean;
  enableColumnHide: boolean;
  enableColumnPin: boolean;
  // Theme
  colorScheme: ColorScheme;
  density: Density;
  accent: string;
  radius: number;
  // Locale
  locale: string;
  direction: 'ltr' | 'rtl' | 'auto';
  frenchMessages: boolean;
  // States
  customEmptyContent: boolean;
  customErrorContent: boolean;
  // Persistence
  persistStateKey: string;
  // Server mode
  failEvery5th: boolean;
  randomizeOrder: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultView: 'table',
  views: ['table', 'grid', 'list'],
  showViewSwitcher: true,
  titleField: '',
  subtitleField: '',
  imageField: '',
  cardMinWidth: 240,
  cardFieldLimit: 6,
  multiSort: false,
  searchable: true,
  filterable: true,
  searchDebounceMs: 200,
  columnFlagsTarget: '',
  columnFlags: {},
  pagination: 'pages',
  defaultPageSize: 25,
  pageSizeOptions: '10, 25, 50, 100',
  height: 600,
  selectionMode: 'none',
  every7thUnselectable: false,
  controlledSelection: false,
  useCustomColumns: false,
  customStatusBadge: false,
  customCard: false,
  customListItem: false,
  enableColumnResize: true,
  enableColumnReorder: true,
  enableColumnHide: true,
  enableColumnPin: true,
  colorScheme: 'auto',
  density: 'standard',
  accent: '',
  radius: 8,
  locale: '',
  direction: 'auto',
  frenchMessages: false,
  customEmptyContent: false,
  customErrorContent: false,
  persistStateKey: '',
  failEvery5th: false,
  randomizeOrder: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);
  return { settings, update, reset, setSettings };
}
