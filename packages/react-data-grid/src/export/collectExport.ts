import type { EffectiveColumn } from '../core/columnState';
import { formatCell, type FormatOptions } from '../core/format';
import { runPipeline } from '../core/pipeline';
import type { ExportScope, FilterCondition, RowId, SortItem } from '../types';

export interface ExportTable {
  headers: string[];
  rows: string[][];
}

export interface CollectExportInput<TRow> {
  scope: ExportScope;
  rows: readonly TRow[];
  rowIds: readonly RowId[];
  /** Every column in display order, including hidden columns. */
  columns: readonly EffectiveColumn<TRow>[];
  visibleColumns: readonly EffectiveColumn<TRow>[];
  search: string;
  filters: readonly FilterCondition[];
  sort: readonly SortItem[];
  locale?: string;
  serverMode: boolean;
  /** Indexes of the rows on the current page (or every match in scroll mode). */
  displayIndexes: readonly number[];
  selectedIds: ReadonlySet<RowId>;
  formatOptions: FormatOptions;
}

function viewIndexes<TRow>(input: CollectExportInput<TRow>): number[] {
  if (input.serverMode) return input.rows.map((_, index) => index);
  return runPipeline({
    rows: input.rows,
    columns: input.columns,
    searchColumns: input.visibleColumns.filter((column) => column.searchable),
    search: input.search,
    filters: input.filters,
    sort: input.sort,
    locale: input.locale,
  }).indexes;
}

function indexesFor<TRow>(input: CollectExportInput<TRow>): number[] {
  switch (input.scope) {
    case 'all':
      return input.rows.map((_, index) => index);
    case 'page':
      return [...input.displayIndexes];
    case 'view':
      return viewIndexes(input);
    case 'selected': {
      const selected = input.selectedIds;
      const ordered = viewIndexes(input).filter((index) => {
        const id = input.rowIds[index];
        return id !== undefined && selected.has(id);
      });
      const seen = new Set(ordered);
      for (let index = 0; index < input.rows.length; index++) {
        const id = input.rowIds[index];
        if (id !== undefined && selected.has(id) && !seen.has(index)) ordered.push(index);
      }
      return ordered;
    }
    default: {
      const unreachable: never = input.scope;
      return unreachable;
    }
  }
}

/**
 * Rows and cell text for one export scope. Values match the grid's cell formatting.
 * Every scope includes every column, including hidden ones, of every type.
 */
export function collectExport<TRow>(input: CollectExportInput<TRow>): ExportTable {
  const columns = input.columns;
  const indexes = indexesFor(input);
  return {
    headers: columns.map((column) => column.header),
    rows: indexes.map((index) => {
      const row = input.rows[index] as TRow;
      return columns.map((column) => formatCell(row, column, input.formatOptions));
    }),
  };
}
