import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useColumnReorder } from '../../src/views/table/useColumnReorder';

function Probe({
  enabled = true,
  onMove,
}: {
  enabled?: boolean;
  onMove: (id: string, targetId: string) => void;
}) {
  const { dragging, over, handlers } = useColumnReorder({ enabled, onMove });
  return (
    <div>
      <div data-testid="a" {...handlers('a', true)} />
      <div data-testid="b" {...handlers('b', true)} />
      <div data-testid="c" {...handlers('c', false)} />
      <div data-testid="status">
        {dragging ?? ''}|{over ?? ''}
      </div>
    </div>
  );
}

const transfer = () => ({
  effectAllowed: '',
  dropEffect: '',
  setData: vi.fn(),
  getData: vi.fn(() => ''),
});

describe('useColumnReorder', () => {
  it('drags a column onto another and clears the highlight', () => {
    const onMove = vi.fn();
    render(<Probe onMove={onMove} />);
    const dataTransfer = transfer();
    expect(screen.getByTestId('a')).toHaveAttribute('draggable', 'true');
    expect(screen.getByTestId('c')).toHaveAttribute('draggable', 'false');

    fireEvent.dragStart(screen.getByTestId('a'), { dataTransfer });
    expect(screen.getByTestId('status')).toHaveTextContent('a|');
    fireEvent.dragOver(screen.getByTestId('b'), { dataTransfer });
    expect(screen.getByTestId('status')).toHaveTextContent('a|b');
    fireEvent.dragLeave(screen.getByTestId('b'));
    expect(screen.getByTestId('status')).toHaveTextContent('a|');
    fireEvent.dragOver(screen.getByTestId('a'), { dataTransfer });
    expect(screen.getByTestId('status')).toHaveTextContent('a|');
    fireEvent.drop(screen.getByTestId('b'), { dataTransfer });
    expect(onMove).toHaveBeenCalledWith('a', 'b');
    expect(screen.getByTestId('status')).toHaveTextContent('|');
  });

  it('does not move a locked column, a drop on itself, or a grid with reorder turned off', () => {
    const onMove = vi.fn();
    const view = render(<Probe onMove={onMove} />);
    const dataTransfer = transfer();
    fireEvent.dragStart(screen.getByTestId('c'), { dataTransfer });
    expect(screen.getByTestId('status')).toHaveTextContent('|');
    fireEvent.dragStart(screen.getByTestId('a'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('a'), { dataTransfer });
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.dragStart(screen.getByTestId('a'), { dataTransfer });
    fireEvent.dragEnd(screen.getByTestId('a'));
    expect(screen.getByTestId('status')).toHaveTextContent('|');
    view.unmount();

    render(<Probe enabled={false} onMove={onMove} />);
    expect(screen.getByTestId('a')).not.toHaveAttribute('draggable');
    fireEvent.dragStart(screen.getByTestId('a'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('b'), { dataTransfer });
    expect(onMove).not.toHaveBeenCalled();
  });
});
