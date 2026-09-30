import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Drag-to-resize for table columns (FR-037). While dragging, the width is a
 * local draft; it is committed to column state on pointer up.
 */
export function useColumnResize(options: {
  rtl: boolean;
  onCommit(id: string, width: number): void;
  clamp(id: string, width: number): number;
}) {
  const [draft, setDraft] = useState<{ id: string; width: number } | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const startResize = useCallback((id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const cell = handle.parentElement;
    const startWidth = cell ? cell.getBoundingClientRect().width : 0;
    const startX = event.clientX;
    let latest = startWidth;
    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore (e.g. synthetic events in tests)
    }

    const onMove = (e: PointerEvent) => {
      const dir = optionsRef.current.rtl ? -1 : 1;
      latest = optionsRef.current.clamp(id, startWidth + (e.clientX - startX) * dir);
      setDraft({ id, width: latest });
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      setDraft(null);
      if (latest !== startWidth) optionsRef.current.onCommit(id, latest);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }, []);

  return { draft, startResize };
}
