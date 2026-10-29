import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useColumnResize } from '../../src/views/table/useColumnResize';

function Probe({
  rtl,
  onCommit,
  clamp,
}: {
  rtl: boolean;
  onCommit: (id: string, width: number) => void;
  clamp: (id: string, width: number) => number;
}) {
  const { draft, startResize } = useColumnResize({ rtl, onCommit, clamp });
  return (
    <div data-testid="cell">
      <button type="button" data-testid="handle" onPointerDown={(event) => startResize('name', event)} />
      <span data-testid="draft">{draft ? `${draft.id}:${draft.width}` : 'idle'}</span>
    </div>
  );
}

describe('useColumnResize', () => {
  const rect = () =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
      this: HTMLElement,
    ) {
      const width = this.dataset.testid === 'cell' ? 180 : 0;
      return {
        width,
        height: 32,
        top: 0,
        left: 0,
        right: width,
        bottom: 32,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      } as DOMRect;
    });

  it('drags the width, clamps it, and commits on release', () => {
    const spy = rect();
    const onCommit = vi.fn();
    const clamp = vi.fn((_id: string, width: number) => Math.min(200, Math.max(60, Math.round(width))));
    render(<Probe rtl={false} onCommit={onCommit} clamp={clamp} />);
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(handle, { button: 0, clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 70, pointerId: 1 });
    expect(screen.getByTestId('draft')).toHaveTextContent('name:200');
    expect(clamp).toHaveBeenCalled();
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onCommit).toHaveBeenCalledWith('name', 200);
    expect(screen.getByTestId('draft')).toHaveTextContent('idle');
    spy.mockRestore();
  });

  it('grows toward the start in right-to-left layouts and commits on cancel', () => {
    const spy = rect();
    const onCommit = vi.fn();
    render(
      <Probe
        rtl
        onCommit={onCommit}
        clamp={(_id, width) => width}
      />,
    );
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(handle, { button: 0, clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 10, pointerId: 1 });
    expect(screen.getByTestId('draft')).toHaveTextContent('name:210');
    fireEvent(handle, new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
    expect(onCommit).toHaveBeenCalledWith('name', 210);
    spy.mockRestore();
  });

  it('ignores a non-primary button and a drag that does not change the width', () => {
    const spy = rect();
    const onCommit = vi.fn();
    render(<Probe rtl={false} onCommit={onCommit} clamp={(_id, width) => width} />);
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(handle, { button: 2, clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 90, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('draft')).toHaveTextContent('idle');

    fireEvent.pointerDown(handle, { button: 0, clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 40, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onCommit).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
