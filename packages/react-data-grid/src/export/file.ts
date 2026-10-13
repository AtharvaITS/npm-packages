import type { ExportFormat } from '../types';
import type { ExportTable } from './collectExport';
import { tableToCsv } from './csv';
import { tableToExcel } from './excel';
import { tableToPdf } from './pdf';

const EXTENSION: Record<ExportFormat, string> = {
  csv: 'csv',
  excel: 'xlsx',
  pdf: 'pdf',
};

const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

function bytesPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function exportFileName(base: string | undefined, format: ExportFormat): string {
  const cleaned = (base ?? 'export').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim() || 'export';
  const extension = EXTENSION[format];
  return cleaned.toLowerCase().endsWith('.' + extension) ? cleaned : `${cleaned}.${extension}`;
}

export function buildExportBlob(table: ExportTable, format: ExportFormat): Blob {
  switch (format) {
    case 'csv':
      return new Blob([tableToCsv(table)], { type: MIME.csv });
    case 'excel':
      return new Blob([bytesPart(tableToExcel(table))], { type: MIME.excel });
    case 'pdf':
      return new Blob([bytesPart(tableToPdf(table))], { type: MIME.pdf });
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}
