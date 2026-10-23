import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useGrid } from '../state/GridContext';
import type { ConditionalFormatRule, HeaderStyle, TextAlignment } from '../types';
import {
  formatToStyle,
  resolveCellFormat,
  resolveCellOnlyFormat,
  resolveRowFormat,
} from './evaluate';

export interface ConditionalFormatContextValue {
  rules: ConditionalFormatRule[];
  setRules(rules: ConditionalFormatRule[]): void;
  headerStyle: HeaderStyle;
  setHeaderStyle(style: HeaderStyle): void;
  textAlignment: TextAlignment;
  setTextAlignment(alignment: TextAlignment): void;
}

const ConditionalFormatContext = createContext<ConditionalFormatContextValue | null>(null);

export function ConditionalFormatProvider({
  rules,
  setRules,
  headerStyle,
  setHeaderStyle,
  textAlignment,
  setTextAlignment,
  children,
}: ConditionalFormatContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ rules, setRules, headerStyle, setHeaderStyle, textAlignment, setTextAlignment }),
    [rules, setRules, headerStyle, setHeaderStyle, textAlignment, setTextAlignment],
  );
  return (
    <ConditionalFormatContext.Provider value={value}>{children}</ConditionalFormatContext.Provider>
  );
}

export function useConditionalFormat(): ConditionalFormatContextValue {
  const ctx = useContext(ConditionalFormatContext);
  if (!ctx) throw new Error('Conditional formatting used outside the grid.');
  return ctx;
}

export interface RowFormatStyles {
  rowStyle: CSSProperties | undefined;
  cellStyle(columnId: string): CSSProperties | undefined;
  mergedCellStyle(columnId: string): CSSProperties | undefined;
}

const NO_STYLE = (): undefined => undefined;

/** Styles for one data row. Empty when no rules are configured. */
export function useConditionalFormats(rowIndex: number): RowFormatStyles {
  const grid = useGrid();
  const { rules } = useConditionalFormat();
  const row = grid.rows[rowIndex];
  const columns = grid.columns;
  return useMemo(() => {
    if (rules.length === 0 || row === undefined) {
      return { rowStyle: undefined, cellStyle: NO_STYLE, mergedCellStyle: NO_STYLE };
    }
    const cellOnly = new Map<string, CSSProperties | undefined>();
    const merged = new Map<string, CSSProperties | undefined>();
    for (const column of columns) {
      cellOnly.set(column.id, formatToStyle(resolveCellOnlyFormat(rules, row, columns, column.id)));
      merged.set(column.id, formatToStyle(resolveCellFormat(rules, row, columns, column.id)));
    }
    return {
      rowStyle: formatToStyle(resolveRowFormat(rules, row, columns)),
      cellStyle: (columnId: string) => cellOnly.get(columnId),
      mergedCellStyle: (columnId: string) => merged.get(columnId),
    };
  }, [rules, row, columns]);
}
