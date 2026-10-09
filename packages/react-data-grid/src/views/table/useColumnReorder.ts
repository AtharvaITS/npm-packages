import { useCallback, useRef, useState, type DragEvent } from 'react';

export const COLUMN_DRAG_MIME = 'application/x-aits-grid-column';

/** HTML5 drag-and-drop between header cells (FR-037). */
export function useColumnReorder(options: {
  enabled: boolean;
  onMove(id: string, targetId: string): void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const onMoveRef = useRef(options.onMove);
  onMoveRef.current = options.onMove;

  const handlers = useCallback(
    (id: string, reorderable: boolean) => {
      if (!options.enabled) return {};
      return {
        draggable: reorderable,
        onDragStart: (event: DragEvent) => {
          if (!reorderable) return;
          draggingRef.current = id;
          setDragging(id);
          event.dataTransfer.effectAllowed = 'move';
          try {
            event.dataTransfer.setData(COLUMN_DRAG_MIME, id);
            event.dataTransfer.setData('text/plain', id);
          } catch {
            // some environments restrict dataTransfer
          }
        },
        onDragOver: (event: DragEvent) => {
          if (!draggingRef.current || !reorderable || draggingRef.current === id) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setOver(id);
        },
        onDragLeave: () => setOver((o) => (o === id ? null : o)),
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          const from = draggingRef.current ?? event.dataTransfer.getData(COLUMN_DRAG_MIME);
          draggingRef.current = null;
          setDragging(null);
          setOver(null);
          if (from && from !== id) onMoveRef.current(from, id);
        },
        onDragEnd: () => {
          draggingRef.current = null;
          setDragging(null);
          setOver(null);
        },
      };
    },
    [options.enabled],
  );

  return { dragging, over, handlers };
}
