import type { MouseEvent as ReactMouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { handleRowContextMenu } from '../../src/views/rowContextMenu';

function rowAt(left: number, top: number) {
  const row = document.createElement('div');
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    right: left + 40,
    bottom: top + 24,
    width: 40,
    height: 24,
    toJSON() {},
  } as DOMRect);
  return row;
}

function menuEvent(
  row: HTMLElement,
  init: { button?: number; clientX?: number; clientY?: number },
): ReactMouseEvent<HTMLElement> {
  return {
    button: init.button ?? 0,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    currentTarget: row,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as ReactMouseEvent<HTMLElement>;
}

describe('handleRowContextMenu', () => {
  it('leaves the browser menu alone when the feature is off', () => {
    const open = vi.fn();
    const event = menuEvent(rowAt(4, 8), { button: 2, clientX: 40, clientY: 50 });
    handleRowContextMenu(event, false, 1, open);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens at the pointer for a right-click and keeps that row as the anchor', () => {
    const open = vi.fn();
    const row = rowAt(4, 8);
    const event = menuEvent(row, { button: 2, clientX: 40, clientY: 50 });
    handleRowContextMenu(event, true, 3, open);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(3, 40, 50, row);
  });

  it('uses a non-zero pointer position even when the button is not the right button', () => {
    const open = vi.fn();
    const row = rowAt(4, 8);
    handleRowContextMenu(menuEvent(row, { button: 0, clientX: 12, clientY: 0 }), true, 0, open);
    expect(open).toHaveBeenCalledWith(0, 12, 0, row);
  });

  it('opens on the row when the keyboard menu has no pointer position', () => {
    const open = vi.fn();
    const row = rowAt(18, 64);
    const event = menuEvent(row, { button: 0, clientX: 0, clientY: 0 });
    handleRowContextMenu(event, true, 2, open);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(2, 18, 64, row);
  });
});
