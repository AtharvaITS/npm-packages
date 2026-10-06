import type { ExportTable } from './collectExport';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** UTF-8 CSV with a BOM so Excel opens non-ASCII text correctly. */
export function tableToCsv(table: ExportTable): string {
  const lines = [table.headers, ...table.rows].map((row) => row.map(escapeCsv).join(','));
  return `\uFEFF${lines.join('\r\n')}`;
}
