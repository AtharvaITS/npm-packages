import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useIsomorphicLayoutEffect } from '../state/useIsomorphicLayoutEffect';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const el = ref.current;
    if (!anchor || !el) return;
    const rect = anchor.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    let left = alignEnd !== rtl ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, vw - width - 8));
    let top = rect.bottom + 4;
    if (top + height > vh - 8 && rect.top - height - 4 > 8) top = rect.top - height - 4;
    setStyle({ position: 'fixed', top, left, visibility: 'visible' });
  }, [anchorRef, alignEnd]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    position();
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
    const onScrollOrResize = () => position();
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
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
      style={style}
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
