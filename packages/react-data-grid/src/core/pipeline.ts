import type { FilterCondition, SortItem } from '../types';
import type { ResolvedColumn } from './columns';
import { filterIndexes } from './filter';
import { searchIndexes } from './search';
import { sortIndexes } from './sort';

export interface PipelineInput<TRow> {
  rows: readonly TRow[];
  columns: readonly ResolvedColumn<TRow>[];
  /** Columns searched (visible + searchable); defaults to `columns`. */
  searchColumns?: readonly ResolvedColumn<TRow>[];
  search: string;
  filters: readonly FilterCondition[];
  sort: readonly SortItem[];
  locale?: string;
}

export interface PipelineResult {
  /** Indexes into `rows`, in display order. */
  indexes: number[];
  matchCount: number;
}

/** search → filter → sort (research R7). Pure; never mutates its inputs. */
export function runPipeline<TRow>(input: PipelineInput<TRow>): PipelineResult {
  const all = new Array<number>(input.rows.length);
  for (let i = 0; i < all.length; i++) all[i] = i;
  let indexes = input.search.trim()
    ? searchIndexes(input.rows, all, input.search, input.searchColumns ?? input.columns)
    : all;
  if (input.filters.length > 0) {
    indexes = filterIndexes(input.rows, indexes, input.filters, input.columns);
  }
  if (input.sort.length > 0) {
    indexes = sortIndexes(input.rows, indexes, input.sort, input.columns, input.locale);
  }
  return { indexes, matchCount: indexes.length };
}
