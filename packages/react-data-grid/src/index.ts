export { ReactDataGrid } from './ReactDataGrid';
export { defaultMessages } from './i18n/messages';
import type { ColumnDef } from './types';

/** Identity helper that gives column definitions full row-type inference. */
export function createColumns<TRow>(defs: ColumnDef<TRow>[]): ColumnDef<TRow>[] {
  return defs;
}

export type {
  ReactDataGridProps,
  CardContext,
  CardField,
  CellContext,
  CellEdit,
  ColorScheme,
  ColumnDef,
  ColumnStateItem,
  ColumnType,
  DataPage,
  DataRequest,
  Density,
  FetchDataOptions,
  ConditionalFormatRule,
  ConditionalFormatStyle,
  HeaderFontWeight,
  HeaderStyle,
  HeaderTextTransform,
  TextAlignValue,
  TextAlignment,
  FilterCondition,
  FilterOperator,
  FormatFontStyle,
  FormatFontWeight,
  FormatOperator,
  FormatScope,
  GridState,
  ListItemContext,
  Messages,
  RowId,
  SelectionMode,
  SortDirection,
  SortItem,
  StateContent,
  StateContentContext,
  Theme,
  ThemeToken,
  ViewType,
} from './types';
