import { describe, expect, it } from 'vitest';
import { applyColumnState, setColumnHidden } from '../../src/core/columnState';
import { resolveColumns } from '../../src/core/columns';
import { collectExport, type CollectExportInput } from '../../src/export/collectExport';
import { tableToCsv } from '../../src/export/csv';
import { tableToExcel } from '../../src/export/excel';
import { exportFileName } from '../../src/export/file';
import { tableToPdf } from '../../src/export/pdf';

const rows = [
  { id: 'a', name: 'Ada, "Lovelace"', role: 'Math', city: 'London' },
  { id: 'b', name: 'Alan', role: 'CS', city: 'Wilmslow' },
  { id: 'c', name: 'Grace', role: 'CS', city: 'New York' },
];

const columns = resolveColumns(
  [{ field: 'name' }, { field: 'role' }, { field: 'city' }],
  rows,
);
const hiddenCity = setColumnHidden(
  applyColumnState(columns, []).ordered,
  [],
  'city',
  true,
)!;
const withCity = applyColumnState(columns, hiddenCity);

function collect(
  overrides: Partial<CollectExportInput<(typeof rows)[number]>> = {},
) {
  return collectExport({
    scope: 'view',
    rows,
    rowIds: rows.map((row) => row.id),
    columns: withCity.ordered,
    visibleColumns: withCity.visible,
    search: '',
    filters: [],
    sort: [],
    locale: 'en-US',
    serverMode: false,
    displayIndexes: [0, 1],
    selectedIds: new Set<string>(),
    formatOptions: { locale: 'en-US', messages: { yes: 'Yes', no: 'No' } },
    ...overrides,
  });
}

describe('export scopes', () => {
  it('exports the filtered sorted view with visible columns only', () => {
    const table = collect({ search: 'cs', sort: [{ columnId: 'name', direction: 'desc' }] });
    expect(table.headers).toEqual(['Name', 'Role']);
    expect(table.rows.map((row) => row[0])).toEqual(['Grace', 'Alan']);
  });

  it('exports every source row and hidden columns for all data', () => {
    const table = collect({ scope: 'all', search: 'cs' });
    expect(table.headers).toEqual(['Name', 'Role', 'City']);
    expect(table.rows.map((row) => row[0])).toEqual(['Ada, "Lovelace"', 'Alan', 'Grace']);
    expect(table.rows[0]?.[2]).toBe('London');
  });

  it('exports the indexes of the current page', () => {
    const table = collect({ scope: 'page', displayIndexes: [1] });
    expect(table.rows).toEqual([['Alan', 'CS']]);
  });

  it('exports selected rows, including a selection hidden by the current search', () => {
    const table = collect({
      scope: 'selected',
      search: 'cs',
      selectedIds: new Set(['a', 'c']),
    });
    expect(table.rows.map((row) => row[0])).toEqual(['Grace', 'Ada, "Lovelace"']);
  });
});

/** Reads an uncompressed zip and returns each entry as text. */
function unzipStored(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index--) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip end record missing');
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files: Record<string, string> = {};
  for (let entry = 0; entry < count; entry++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('bad central header');
    const method = view.getUint16(cursor + 10, true);
    const size = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (method !== 0) throw new Error(`unexpected compression for ${name}`);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtra;
    files[name] = new TextDecoder().decode(bytes.subarray(start, start + size));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

describe('export files', () => {
  const table = {
    headers: ['Name', 'Role'],
    rows: [['Ada, "Lovelace"', 'Math'], ['Alan', 'CS']],
  };

  it('writes a quoted UTF-8 CSV', () => {
    const csv = tableToCsv(table);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Name,Role\r\n"Ada, ""Lovelace""",Math\r\nAlan,CS');
  });

  it('writes an xlsx package whose worksheet contains the cell text', () => {
    const bytes = tableToExcel(table);
    const files = unzipStored(bytes);
    expect(files['[Content_Types].xml']).toContain('sheet.main+xml');
    expect(files['xl/worksheets/sheet1.xml']).toContain('Ada, "Lovelace"');
    expect(files['xl/worksheets/sheet1.xml']).toContain('t="inlineStr"');
    expect(files['xl/workbook.xml']).toContain('sheet name="Sheet1"');
  });

  it('writes a PDF that contains the table text and paginates long tables', () => {
    const bytes = tableToPdf(table);
    const pdf = new TextDecoder('latin1').decode(bytes);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('(Name)');
    expect(pdf).toContain('(Ada, "Lovelace")');
    expect(pdf).toContain('%%EOF');
    const start = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.slice(start, start + 4)).toBe('xref');

    const many = tableToPdf({
      headers: ['Name'],
      rows: Array.from({ length: 80 }, (_, index) => [`Row ${index}`]),
    });
    const longPdf = new TextDecoder('latin1').decode(many);
    expect(longPdf).toContain('/Count 3');
    expect(longPdf).toContain('(Row 0)');
    expect(longPdf).toContain('(Row 79)');
  });

  it('adds the format extension once', () => {
    expect(exportFileName('people', 'excel')).toBe('people.xlsx');
    expect(exportFileName('people.csv', 'csv')).toBe('people.csv');
    expect(exportFileName('a/b:c', 'pdf')).toBe('a b c.pdf');
    expect(exportFileName('   ', 'csv')).toBe('export.csv');
  });
});
