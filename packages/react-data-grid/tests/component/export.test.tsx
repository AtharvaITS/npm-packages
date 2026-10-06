import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactDataGrid } from '../../src';

const rows = [
  { id: 'a', name: 'Ada', role: 'Math' },
  { id: 'b', name: 'Alan', role: 'CS' },
  { id: 'c', name: 'Grace', role: 'CS' },
];

const columns = [{ field: 'name' }, { field: 'role' }];

describe('export options dialog', () => {
  afterEach(() => vi.restoreAllMocks());

  function captureDownload() {
    const blobs: Blob[] = [];
    let fileName = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:export';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      fileName = this.download;
    });
    return {
      blobs,
      fileName: () => fileName,
    };
  }

  it('does not render the button when export is turned off', () => {
    render(<ReactDataGrid data={rows} columns={columns} exportable={false} />);
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
  });

  it('downloads the current page as CSV', async () => {
    const download = captureDownload();
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        defaultPageSize={2}
        pageSizeOptions={[2]}
        exportFileName="people"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const dialog = screen.getByRole('dialog', { name: 'Export options' });
    expect(within(dialog).getByRole('radio', { name: 'Selected Rows' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Current Page' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'CSV' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Export' }));

    expect(screen.queryByRole('dialog', { name: 'Export options' })).toBeNull();
    expect(download.fileName()).toBe('people.csv');
    const text = await download.blobs[0]!.text();
    expect(text).toContain('Name,Role');
    expect(text).toContain('Ada,Math');
    expect(text).toContain('Alan,CS');
    expect(text).not.toContain('Grace');
  });

  it('downloads selected rows as Excel', async () => {
    const download = captureDownload();
    render(
      <ReactDataGrid
        data={rows}
        columns={columns}
        getRowId="id"
        selectionMode="multi"
        defaultSelection={['c']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const dialog = screen.getByRole('dialog', { name: 'Export options' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Selected Rows' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Excel' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Export' }));

    expect(download.fileName()).toBe('export.xlsx');
    const bytes = new Uint8Array(await download.blobs[0]!.arrayBuffer());
    expect(new TextDecoder().decode(bytes)).toContain('Grace');
    expect(new TextDecoder().decode(bytes)).not.toContain('>Ada<');
  });

  it('keeps the dialog open when the chosen scope has no rows', () => {
    const download = captureDownload();
    render(<ReactDataGrid data={rows} columns={columns} search="zzzzz" />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const dialog = screen.getByRole('dialog', { name: 'Export options' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(dialog).toHaveTextContent('Nothing to export.');
    expect(download.blobs).toHaveLength(0);
  });
});
