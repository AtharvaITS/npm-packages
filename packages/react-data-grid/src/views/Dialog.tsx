import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useIsomorphicLayoutEffect } from '../state/useIsomorphicLayoutEffect';
import { CloseIcon } from './icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Centered modal. Promoted with the Popover API when available so a scrolling
 * grid cannot clip it. Escape, the close button, and a press on the backdrop
 * all call `onClose`.
 */
export function Dialog({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose(): void;
  children: ReactNode;
}) {
  const titleId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useIsomorphicLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    el.style.position = 'fixed';
    el.style.inset = '0px';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.maxWidth = 'none';
    el.style.maxHeight = 'none';
    el.style.margin = '0px';
    let shown = false;
    if (typeof el.showPopover === 'function') {
      try {
        el.setAttribute('popover', 'manual');
        el.showPopover();
        shown = true;
      } catch {
        el.removeAttribute('popover');
      }
    }
    return () => {
      if (!shown) return;
      try {
        el.hidePopover();
      } catch {
        // already detached or hidden
      }
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const panel = layer?.querySelector<HTMLElement>('[role="dialog"]');
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const field = panel?.querySelector<HTMLElement>('input, select, textarea');
    const first = field ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab') return;
    const layer = layerRef.current;
    if (!layer) return;
    const focusables = Array.from(layer.querySelectorAll<HTMLElement>(FOCUSABLE));
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
  };

  const onBackdrop = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCloseRef.current();
  };

  return (
    <div
      ref={layerRef}
      className="aits-dialog-layer"
      onKeyDown={onKeyDown}
      onPointerDown={onBackdrop}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="aits-dialog"
        tabIndex={-1}
      >
        <div className="aits-dialog-header">
          <h2 id={titleId} className="aits-dialog-title">
            {title}
          </h2>
          <button
            type="button"
            className="aits-icon-button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
