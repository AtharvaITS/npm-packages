import type { MouseEvent } from 'react';

/** Right-click (or the keyboard context menu) on one data row. */
export function handleRowContextMenu(
  event: MouseEvent<HTMLElement>,
  enabled: boolean,
  rowIndex: number,
  openRowMenu: (rowIndex: number, x: number, y: number, anchor: HTMLElement) => void,
): void {
  if (!enabled) return;
  event.preventDefault();
  event.stopPropagation();
  const anchor = event.currentTarget;
  const box = anchor.getBoundingClientRect();
  const fromPointer = event.button === 2 || event.clientX !== 0 || event.clientY !== 0;
  openRowMenu(
    rowIndex,
    fromPointer ? event.clientX : box.left,
    fromPointer ? event.clientY : box.top,
    anchor,
  );
}
