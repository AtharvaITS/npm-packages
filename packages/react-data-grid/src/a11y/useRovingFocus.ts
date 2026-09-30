import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

export interface Position {
  row: number;
  col: number;
}

export interface RovingFocusOptions {
  rowCount: number;
  colCount: number;
  containerRef: RefObject<HTMLElement | null>;
  rtl?: boolean;
  /** Rows moved by PageUp/PageDown. */
  pageRows?: number;
  /** For card grids: total items, so the last partial row is respected. */
  itemCount?: number;
  /** Called after each keyboard move so virtualized views can scroll the row into view. */
  onEnsureVisible?: (row: number) => void;
  /** Enter. */
  onActivate?: (pos: Position, event: KeyboardEvent) => void;
  /** Space. */
  onToggle?: (pos: Position, event: KeyboardEvent) => void;
  /** Custom keys first; return true when handled. */
  onKey?: (pos: Position, event: KeyboardEvent) => boolean;
}

export const POS_ROW = 'data-aits-r';
export const POS_COL = 'data-aits-c';

function readPosition(el: Element | null): Position | undefined {
  const item = el?.closest?.(`[${POS_ROW}]`);
  if (!item) return undefined;
  const row = Number(item.getAttribute(POS_ROW));
  const col = Number(item.getAttribute(POS_COL) ?? 0);
  return Number.isFinite(row) && Number.isFinite(col) ? { row, col } : undefined;
}

/**
 * 2D roving tabindex (WAI-ARIA APG grid pattern, research R10). Exactly one
 * item is in the tab order; arrows, Home/End, Ctrl+Home/End and PageUp/PageDown
 * move focus. Left/Right swap in right-to-left layouts.
 */
export function useRovingFocus(options: RovingFocusOptions) {
  const { rowCount, colCount, containerRef, rtl = false, pageRows = 10, itemCount } = options;
  const [active, setActiveState] = useState<Position>({ row: 0, col: 0 });
  const pendingFocus = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const maxRow = Math.max(0, rowCount - 1);
  const maxCol = Math.max(0, colCount - 1);
  const clampPos = useCallback(
    (pos: Position): Position => {
      let row = Math.min(Math.max(0, pos.row), maxRow);
      let col = Math.min(Math.max(0, pos.col), maxCol);
      if (itemCount !== undefined && colCount > 0) {
        const lastIndex = Math.max(0, itemCount - 1);
        if (row * colCount + col > lastIndex) {
          row = Math.floor(lastIndex / colCount);
          col = lastIndex % colCount;
        }
      }
      return { row, col };
    },
    [maxRow, maxCol, itemCount, colCount],
  );
  const current = clampPos(active);

  const moveTo = useCallback(
    (pos: Position) => {
      const next = clampPos(pos);
      pendingFocus.current = true;
      setActiveState(next);
      optionsRef.current.onEnsureVisible?.(next.row);
    },
    [clampPos],
  );

  // Focus the active item after keyboard moves (it may render after scrolling).
  useEffect(() => {
    if (!pendingFocus.current) return;
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[${POS_ROW}="${current.row}"][${POS_COL}="${current.col}"]`,
    );
    if (el) {
      pendingFocus.current = false;
      if (el !== document.activeElement) el.focus({ preventScroll: false });
    }
  });

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as Element;
      if (event.defaultPrevented || target.closest?.('.aits-popover')) return;
      const pos = readPosition(target);
      if (!pos) return;
      // Ignore keys from inputs/buttons inside custom content.
      const item = target.closest(`[${POS_ROW}]`);
      if (item !== target && target.matches('input, textarea, select, [contenteditable="true"]'))
        return;
      const opts = optionsRef.current;
      if (opts.onKey?.(pos, event)) return;

      const horizontal = rtl ? -1 : 1;
      const ctrl = event.ctrlKey || event.metaKey;
      const singleColumn = colCount <= 1;
      let next: Position | undefined;
      switch (event.key) {
        case 'ArrowDown':
          next = { row: pos.row + 1, col: pos.col };
          break;
        case 'ArrowUp':
          next = { row: pos.row - 1, col: pos.col };
          break;
        case 'ArrowRight':
          if (singleColumn) return;
          next = { row: pos.row, col: pos.col + horizontal };
          break;
        case 'ArrowLeft':
          if (singleColumn) return;
          next = { row: pos.row, col: pos.col - horizontal };
          break;
        case 'Home':
          next = ctrl || singleColumn ? { row: 0, col: 0 } : { row: pos.row, col: 0 };
          break;
        case 'End':
          next =
            ctrl || singleColumn ? { row: maxRow, col: maxCol } : { row: pos.row, col: maxCol };
          break;
        case 'PageDown':
          next = { row: pos.row + (opts.pageRows ?? pageRows), col: pos.col };
          break;
        case 'PageUp':
          next = { row: pos.row - (opts.pageRows ?? pageRows), col: pos.col };
          break;
        case 'Enter':
          if (opts.onActivate) {
            event.preventDefault();
            opts.onActivate(pos, event);
          }
          return;
        case ' ':
        case 'Spacebar':
          if (opts.onToggle) {
            event.preventDefault();
            opts.onToggle(pos, event);
          }
          return;
        default:
          return;
      }
      event.preventDefault();
      moveTo(next);
    },
    [rtl, colCount, maxRow, maxCol, pageRows, moveTo],
  );

  /** Keep the active item in sync when focus arrives by mouse or Tab. */
  const onFocus = useCallback((event: FocusEvent) => {
    const pos = readPosition(event.target as Element);
    if (!pos) return;
    setActiveState((prev) => (prev.row === pos.row && prev.col === pos.col ? prev : pos));
  }, []);

  const tabIndexFor = useCallback(
    (row: number, col: number) => (row === current.row && col === current.col ? 0 : -1),
    [current.row, current.col],
  );

  const itemProps = useCallback(
    (row: number, col: number) => ({
      [POS_ROW]: row,
      [POS_COL]: col,
      tabIndex: row === current.row && col === current.col ? 0 : -1,
    }),
    [current.row, current.col],
  );

  return { active: current, setActive: moveTo, onKeyDown, onFocus, tabIndexFor, itemProps };
}
