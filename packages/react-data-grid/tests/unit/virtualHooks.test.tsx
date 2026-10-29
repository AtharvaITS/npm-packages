import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LiveRegion, useAnnouncer } from '../../src/a11y/LiveRegion';
import { useElementSize } from '../../src/virtual/useElementSize';
import { useMeasuredItemSize } from '../../src/virtual/useMeasuredItemSize';
import { useVirtualRows } from '../../src/virtual/useVirtualRows';

describe('useAnnouncer', () => {
  it('debounces announcements and repeats an identical message', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result, unmount } = renderHook(() => useAnnouncer(150));
    act(() => result.current.announce('3 results'));
    act(() => result.current.announce('1 result'));
    expect(result.current.message).toBe('');
    act(() => vi.advanceTimersByTime(149));
    expect(result.current.message).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.message).toBe('1 result');
    act(() => result.current.announce('1 result'));
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.message).toBe('1 result\u00a0');
    unmount();
    act(() => vi.advanceTimersByTime(500));
    vi.useRealTimers();
  });

  it('renders a polite live region', () => {
    render(<LiveRegion message="4 results" />);
    expect(screen.getByRole('status')).toHaveTextContent('4 results');
  });
});

describe('useElementSize', () => {
  it('reads the observed size and stays at zero when disabled or unmounted', () => {
    function Probe({ enabled }: { enabled: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      const size = useElementSize(ref, enabled);
      return (
        <div ref={ref} data-testid="box" data-test-width="320" data-test-height="180">
          {size.width}x{size.height}
        </div>
      );
    }
    const view = render(<Probe enabled={false} />);
    expect(screen.getByTestId('box')).toHaveTextContent('0x0');
    view.rerender(<Probe enabled />);
    expect(screen.getByTestId('box')).toHaveTextContent('320x180');

    const missing = renderHook(() => useElementSize({ current: null }));
    expect(missing.result.current).toEqual({ width: 0, height: 0 });
  });

  it('stays at zero when ResizeObserver is unavailable', () => {
    const original = globalThis.ResizeObserver;
    // @ts-expect-error test the server-style fallback
    delete globalThis.ResizeObserver;
    const el = document.createElement('div');
    const { result } = renderHook(() => useElementSize({ current: el }));
    expect(result.current).toEqual({ width: 0, height: 0 });
    globalThis.ResizeObserver = original;
  });
});

describe('useMeasuredItemSize', () => {
  it('uses the measured sample and falls back when nothing is rendered', () => {
    const container = document.createElement('div');
    const item = document.createElement('div');
    item.className = 'sample';
    item.getBoundingClientRect = () => ({ height: 48.4 }) as DOMRect;
    container.appendChild(item);
    const measured = renderHook(() => useMeasuredItemSize({ current: container }, '.sample', 30, []));
    expect(measured.result.current).toBe(48);

    const empty = renderHook(() => useMeasuredItemSize({ current: container }, '.missing', 30, []));
    expect(empty.result.current).toBe(30);
  });
});

describe('useVirtualRows', () => {
  it('renders the initial window before layout, then the full list when disabled', () => {
    const pending = renderHook(() =>
      useVirtualRows({ count: 100, itemSize: 30, scrollRef: { current: null }, initialCount: 8 }),
    );
    expect(pending.result.current).toMatchObject({ start: 0, end: 8, offsetTop: 0 });

    const all = renderHook(() =>
      useVirtualRows({
        count: 100,
        itemSize: 30,
        scrollRef: { current: null },
        enabled: false,
      }),
    );
    expect(all.result.current).toMatchObject({ start: 0, end: 100 });
  });

  it('scrolls an index into view and updates the rendered window', () => {
    function Probe() {
      const ref = useRef<HTMLDivElement>(null);
      const virtual = useVirtualRows({
        count: 100,
        itemSize: 30,
        scrollRef: ref,
        headerOffset: 10,
      });
      return (
        <div ref={ref} data-testid="scroller" data-test-height="90" data-client-height="90">
          <span data-testid="range">
            {virtual.start}:{virtual.end}
          </span>
          <button type="button" onClick={() => virtual.scrollToIndex(20)}>
            jump
          </button>
          <button type="button" onClick={() => virtual.scrollToIndex(0)}>
            top
          </button>
        </div>
      );
    }
    render(<Probe />);
    const scroller = screen.getByTestId('scroller');
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 90 });
    expect(screen.getByTestId('range')).toHaveTextContent('0:9');
    fireEvent.click(screen.getByRole('button', { name: 'jump' }));
    expect(scroller.scrollTop).toBe(550);
    expect(screen.getByTestId('range').textContent).not.toBe('0:9');
    scroller.scrollTop = 520;
    fireEvent.click(screen.getByRole('button', { name: 'top' }));
    expect(scroller.scrollTop).toBe(0);
  });
});
