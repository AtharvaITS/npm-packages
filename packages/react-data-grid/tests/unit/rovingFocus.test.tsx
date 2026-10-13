import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useRovingFocus, type Position } from '../../src/a11y/useRovingFocus';

function Keys({
  rows = 3,
  cols = 2,
  rtl = false,
  itemCount,
  pageRows,
  onActivate,
  onToggle,
  onKey,
  onEnsureVisible,
  withInput = false,
  withPopover = false,
}: {
  rows?: number;
  cols?: number;
  rtl?: boolean;
  itemCount?: number;
  pageRows?: number;
  onActivate?: (pos: Position) => void;
  onToggle?: (pos: Position) => void;
  onKey?: () => boolean;
  onEnsureVisible?: (row: number) => void;
  withInput?: boolean;
  withPopover?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus({
    rowCount: rows,
    colCount: cols,
    containerRef: ref,
    rtl,
    pageRows,
    itemCount,
    onActivate,
    onToggle,
    onKey,
    onEnsureVisible,
  });
  return (
    <div ref={ref} onKeyDown={roving.onKeyDown} onFocus={roving.onFocus}>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          if (withInput && row === 0 && col === 0) {
            return (
              <div key="editor" {...roving.itemProps(row, col)}>
                <input aria-label="editor" />
              </div>
            );
          }
          const button = (
            <button type="button" {...roving.itemProps(row, col)}>
              {row},{col}
            </button>
          );
          if (withPopover && row === 0 && col === 0) {
            return (
              <div key="popover" className="aits-popover">
                {button}
              </div>
            );
          }
          return <div key={`${row}-${col}`}>{button}</div>;
        }),
      )}
    </div>
  );
}

const tabOf = (name: string) => screen.getByRole('button', { name });

describe('useRovingFocus', () => {
  it('moves with arrows, home, end and page keys, including right-to-left', () => {
    const onEnsureVisible = vi.fn();
    render(<Keys onEnsureVisible={onEnsureVisible} pageRows={2} />);
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
    expect(tabOf('0,1')).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowRight' });
    expect(tabOf('0,1')).toHaveAttribute('tabindex', '0');
    expect(onEnsureVisible).toHaveBeenCalledWith(0);

    fireEvent.keyDown(tabOf('0,1'), { key: 'ArrowDown' });
    expect(tabOf('1,1')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('1,1'), { key: 'Home' });
    expect(tabOf('1,0')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('1,0'), { key: 'End' });
    expect(tabOf('1,1')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('1,1'), { key: 'PageDown' });
    expect(tabOf('2,1')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('2,1'), { key: 'PageUp' });
    expect(tabOf('0,1')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('0,1'), { key: 'End', ctrlKey: true });
    expect(tabOf('2,1')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('2,1'), { key: 'Home', metaKey: true });
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
  });

  it('mirrors horizontal keys in right-to-left layouts and clamps a short last row', () => {
    const rtl = render(<Keys rtl />);
    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowLeft' });
    expect(tabOf('0,1')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('0,1'), { key: 'ArrowRight' });
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
    rtl.unmount();

    render(<Keys rows={2} cols={2} itemCount={3} />);
    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowRight' });
    fireEvent.keyDown(tabOf('0,1'), { key: 'ArrowDown' });
    expect(tabOf('1,0')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('1,0'), { key: 'End', ctrlKey: true });
    expect(tabOf('1,0')).toHaveAttribute('tabindex', '0');
  });

  it('activates and toggles, and ignores keys from editors, popovers and custom handlers', () => {
    const onActivate = vi.fn();
    const onToggle = vi.fn();
    const onKey = vi.fn(() => true);
    const view = render(<Keys onActivate={onActivate} onToggle={onToggle} />);
    fireEvent.keyDown(tabOf('0,0'), { key: 'Enter' });
    fireEvent.keyDown(tabOf('0,0'), { key: ' ' });
    expect(onActivate).toHaveBeenCalledWith({ row: 0, col: 0 }, expect.anything());
    expect(onToggle).toHaveBeenCalledWith({ row: 0, col: 0 }, expect.anything());
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
    view.unmount();

    const custom = render(<Keys onKey={onKey} onActivate={onActivate} />);
    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowRight' });
    expect(onKey).toHaveBeenCalled();
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
    custom.unmount();

    const editor = render(<Keys withInput />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'editor' }), { key: 'ArrowDown' });
    expect(document.querySelector('[data-aits-r="0"][data-aits-c="0"]')).toHaveAttribute(
      'tabindex',
      '0',
    );
    editor.unmount();

    render(<Keys withPopover />);
    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowDown' });
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
  });

  it('follows focus that arrives from a click', () => {
    render(<Keys />);
    act(() => {
      tabOf('1,0').focus();
    });
    expect(tabOf('1,0')).toHaveAttribute('tabindex', '0');
  });

  it('leaves a single-column list on vertical keys only', () => {
    render(<Keys rows={2} cols={1} />);
    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowRight' });
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('0,0'), { key: 'ArrowDown' });
    expect(tabOf('1,0')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tabOf('1,0'), { key: 'Home' });
    expect(tabOf('0,0')).toHaveAttribute('tabindex', '0');
  });
});
