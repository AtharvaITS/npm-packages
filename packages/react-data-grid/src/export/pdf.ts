import type { ExportTable } from './collectExport';

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const FONT = 8;
const ROW_H = 16;
const PAD = 3;

const WIN_ANSI: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
};

function winAnsiByte(code: number): number {
  if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) return code;
  return WIN_ANSI[code] ?? 63;
}

function pdfLiteral(text: string): string {
  let out = '(';
  for (const ch of text) {
    const byte = winAnsiByte(ch.codePointAt(0)!);
    if (byte === 0x5c || byte === 0x28 || byte === 0x29) out += '\\' + String.fromCharCode(byte);
    else if (byte < 32 || byte > 126) out += '\\' + byte.toString(8).padStart(3, '0');
    else out += String.fromCharCode(byte);
  }
  return out + ')';
}

function fit(value: string, maxChars: number): string {
  const text = value.replace(/[\r\n]+/g, ' ');
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return text.slice(0, maxChars - 3) + '...';
}

function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function pageStreams(table: ExportTable): string[] {
  const headers = table.headers;
  const cols = Math.max(headers.length, 1);
  const tableW = PAGE_W - MARGIN * 2;
  const colW = tableW / cols;
  const maxChars = Math.max(1, Math.floor((colW - PAD * 2) / (FONT * 0.52)));
  const pages: string[][] = [];
  let lines: string[] = [];
  let y = PAGE_H - MARGIN;

  const drawRow = (cells: string[], header: boolean) => {
    const top = y;
    const bottom = y - ROW_H;
    const font = header ? 'F2' : 'F1';
    if (header) lines.push(`0.93 0.94 0.96 rg\n${num(MARGIN)} ${num(bottom)} ${num(tableW)} ${ROW_H} re f`);
    lines.push(`0.75 0.77 0.8 RG\n0.4 w\n${num(MARGIN)} ${num(bottom)} ${num(tableW)} ${ROW_H} re S`);
    for (let column = 1; column < cols; column++) {
      const x = MARGIN + column * colW;
      lines.push(`${num(x)} ${num(bottom)} m ${num(x)} ${num(top)} l S`);
    }
    cells.forEach((cell, column) => {
      const x = MARGIN + column * colW + PAD;
      const baseline = bottom + 4.5;
      lines.push(
        `BT /${font} ${FONT} Tf 0 0 0 rg 1 0 0 1 ${num(x)} ${num(baseline)} Tm ${pdfLiteral(cell)} Tj ET`,
      );
    });
    y = bottom;
  };

  const startPage = () => {
    lines = [];
    y = PAGE_H - MARGIN;
    drawRow(headers.map((header) => fit(header, maxChars)), true);
  };

  startPage();
  for (const row of table.rows) {
    if (y - ROW_H < MARGIN) {
      pages.push(lines);
      startPage();
    }
    drawRow(
      headers.map((_, index) => fit(row[index] ?? '', maxChars)),
      false,
    );
  }
  pages.push(lines);
  return pages.map((page) => page.join('\n'));
}

function latin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/** Landscape A4 PDF of the table. Built-in Helvetica, one header row per page. */
export function tableToPdf(table: ExportTable): Uint8Array {
  const streams = pageStreams(table);
  const chunks: string[] = [];
  const offsets = [0];
  let length = 0;
  const push = (text: string) => {
    chunks.push(text);
    length += text.length;
  };
  const addObject = (body: string) => {
    offsets.push(length);
    push(`${offsets.length - 1} 0 obj\n${body}\nendobj\n`);
  };

  push('%PDF-1.4\n');
  const kids = streams.map((_, index) => `${5 + index * 2} 0 R`).join(' ');
  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject(`<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>`);
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  for (const stream of streams) {
    const contentId = offsets.length + 1;
    addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
    addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  }

  const xrefAt = length;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index++) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return latin1(chunks.join(''));
}
