import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useIsomorphicLayoutEffect } from '../state/useIsomorphicLayoutEffect';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const GAP = 4;
const MARGIN = 8;

/**
 * Out of flow from the very first render, so the hidden popover can never
 * stretch its parent (a header cell, a wrapping toolbar) and skew the anchor
 * measurement. Position and visibility are written imperatively by `position()`.
 */
const INITIAL_STYLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  visibility: 'hidden',
};

/** True when `anchor` is scrolled out of view, or clipped away by a scrolling ancestor. */
function isAnchorHidden(anchor: HTMLElement): boolean {
  if (!anchor.isConnected) return true;
  const rect = anchor.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  let left = 0;
  let top = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;
  for (let node = anchor.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (overflowX === 'visible' && overflowY === 'visible') continue;
    const box = node.getBoundingClientRect();
    if (overflowX !== 'visible') {
      left = Math.max(left, box.left);
      right = Math.min(right, box.right);
    }
    if (overflowY !== 'visible') {
      top = Math.max(top, box.top);
      bottom = Math.min(bottom, box.bottom);
    }
  }
  return rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom;
}

export interface PopoverProps {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  role?: 'dialog' | 'menu';
  className?: string;
  children: ReactNode;
  /** Align the popover's inline-end edge with the anchor's. */
  alignEnd?: boolean;
  /** Place the dialog in the center of the viewport instead of beside the anchor. */
  centered?: boolean;
}

/**
 * Lightweight anchored popover. Esc and outside clicks close it; focus moves
 * into it on open, is trapped while open (dialog), and returns to the anchor.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  label,
  role = 'dialog',
  className,
  children,
  alignEnd,
  centered,
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const el = ref.current;
    if (!anchor || !el) return;
    // Measure the containing block's offset at 0,0: zero in the top layer, but
    // non-zero when an ancestor with a transform/filter/contain traps `fixed`.
    el.style.top = '0px';
    el.style.left = '0px';
    const origin = el.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    let left = centered
      ? (vw - width) / 2
      : alignEnd !== rtl
        ? rect.right - width
        : rect.left;
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
    let top = centered ? (vh - height) / 2 : rect.bottom + GAP;
    if (
      !centered &&
      top + height > vh - MARGIN &&
      rect.top - height - GAP > MARGIN
    )
      top = rect.top - height - GAP;
    top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN));
    el.style.top = `${top - origin.top}px`;
    el.style.left = `${left - origin.left}px`;
    el.style.visibility = 'visible';
  }, [anchorRef, alignEnd, centered]);

  // Promote to the top layer (when supported) before measuring, so the popover
  // escapes clipping ancestors and is measured against the viewport.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    let shown = false;
    if (el && typeof el.showPopover === 'function') {
      try {
        el.setAttribute('popover', 'manual');
        el.showPopover();
        shown = true;
      } catch {
        el.removeAttribute('popover');
      }
    }
    position();
    return () => {
      if (!el || !shown) return;
      try {
        el.hidePopover();
      } catch {
        // already detached or hidden
      }
    };
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>(
      role === 'menu' ? '[role^="menuitem"]:not([disabled])' : FOCUSABLE,
    );
    (first ?? el)?.focus();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (el?.contains(target) || anchor?.contains(target)) return;
      onCloseRef.current();
    };
    const onScrollOrResize = () => {
      if (anchor && isAnchorHidden(anchor)) {
        onCloseRef.current();
        return;
      }
      position();
    };
    const observer =
      typeof ResizeObserver === 'function' && el ? new ResizeObserver(() => position()) : null;
    if (el) observer?.observe(el);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      observer?.disconnect();
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      // Return focus to the trigger if focus was inside the popover.
      if (
        anchor &&
        (!document.activeElement ||
          document.activeElement === document.body ||
          el?.contains(document.activeElement))
      ) {
        anchor.focus();
      }
    };
  }, [open, anchorRef, role, position]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (
      role === 'menu' &&
      (event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End')
    ) {
      const items = Array.from(
        el.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])'),
      );
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      let next = 0;
      if (event.key === 'ArrowDown') next = (index + 1) % items.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
      else if (event.key === 'End') next = items.length - 1;
      event.preventDefault();
      items[next]?.focus();
      return;
    }
    if (event.key === 'Tab') {
      if (role === 'menu') {
        onCloseRef.current();
        return;
      }
      const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      ref={ref}
      className={'aits-popover' + (className ? ' ' + className : '')}
      role={role}
      aria-label={label}
      aria-modal={role === 'dialog' ? false : undefined}
      tabIndex={-1}
      style={INITIAL_STYLE}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

export interface MenuItem {
  label: string;
  onSelect(): void;
  disabled?: boolean;
  checked?: boolean;
}

export function Menu({
  items,
  onClose,
  ...rest
}: Omit<PopoverProps, 'children' | 'role'> & { items: (MenuItem | 'separator')[] }) {
  return (
    <Popover {...rest} onClose={onClose} role="menu" className="aits-menu">
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={'sep' + i} role="separator" className="aits-menu-separator" />
        ) : (
          <button
            key={item.label}
            type="button"
            role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
            aria-checked={item.checked}
            className="aits-menu-item"
            tabIndex={-1}
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </Popover>
  );
}
