import { fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu } from '../../src/toolbar/Popover';

const rect = (x: number, y: number, w: number, h: number) =>
  ({
    x,
    y,
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
    toJSON() {},
  }) as DOMRect;

function Harness({
  onClose = () => {},
  alignEnd = true,
}: {
  onClose?(): void;
  alignEnd?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ref} type="button">
        anchor
      </button>
      <Menu
        open
        onClose={onClose}
        anchorRef={ref}
        label="Menu"
        alignEnd={alignEnd}
        items={[{ label: 'One', onSelect() {} }]}
      />
    </>
  );
}

let anchorRect: DOMRect;
let measuredPositions: string[] = [];
const POPUP = { w: 176, h: 100 };

beforeEach(() => {
  measuredPositions = [];
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains('aits-popover')) {
      measuredPositions.push(this.style.position);
      // Emulate a containing block at the viewport origin, offset by the applied top/left.
      return rect(0, 0, POPUP.w, POPUP.h);
    }
    return this.tagName === 'BUTTON' && this.textContent === 'anchor'
      ? anchorRect
      : rect(0, 0, 0, 0);
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.classList.contains('aits-popover') ? POPUP.w : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.classList.contains('aits-popover') ? POPUP.h : 0;
  });
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});
afterEach(() => vi.restoreAllMocks());

const menu = () => document.querySelector<HTMLElement>('[role="menu"]')!;

describe('anchored popover placement', () => {
  it('opens below the anchor with its end edge aligned, and becomes visible', () => {
    anchorRect = rect(500, 100, 26, 26);
    render(<Harness />);
    expect(menu().style.position).toBe('fixed');
    expect(menu().style.visibility).toBe('visible');
    expect(menu().style.top).toBe('130px'); // bottom 126 + 4 gap
    expect(menu().style.left).toBe('350px'); // right 526 − width 176
  });

  it('is out of flow from the first render (never measured in normal flow)', () => {
    anchorRect = rect(500, 100, 26, 26);
    render(<Harness />);
    expect(measuredPositions.length).toBeGreaterThan(0);
    expect(measuredPositions.every((p) => p === 'fixed')).toBe(true);
  });

  it('aligns to the anchor start when alignEnd is off', () => {
    anchorRect = rect(500, 100, 26, 26);
    render(<Harness alignEnd={false} />);
    expect(menu().style.left).toBe('500px');
  });

  it('keeps an 8px margin from the viewport edges', () => {
    anchorRect = rect(2, 100, 26, 26);
    const { unmount } = render(<Harness />);
    expect(menu().style.left).toBe('8px');
    unmount();
    anchorRect = rect(990, 100, 26, 26);
    render(<Harness alignEnd={false} />);
    expect(menu().style.left).toBe('816px'); // 1000 − 176 − 8
  });

  it('flips above the anchor when there is no room below', () => {
    anchorRect = rect(500, 740, 26, 26);
    render(<Harness />);
    expect(menu().style.top).toBe('636px'); // 740 − 100 − 4
  });

  it('mirrors placement in right-to-left layouts', () => {
    anchorRect = rect(500, 100, 26, 26);
    const real = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
      const cs = real(el, pseudo);
      return el instanceof HTMLButtonElement
        ? (new Proxy(cs, {
            get: (t, k) => (k === 'direction' ? 'rtl' : Reflect.get(t, k)),
          }) as CSSStyleDeclaration)
        : cs;
    });
    render(<Harness />);
    expect(menu().style.left).toBe('500px'); // start edge of the anchor
  });

  it('corrects for a containing block that is not the viewport', () => {
    anchorRect = rect(500, 100, 26, 26);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.classList.contains('aits-popover')) return rect(40, 30, POPUP.w, POPUP.h);
      return this.textContent === 'anchor' ? anchorRect : rect(0, 0, 0, 0);
    });
    render(<Harness />);
    expect(menu().style.top).toBe('100px'); // 130 − 30
    expect(menu().style.left).toBe('310px'); // 350 − 40
  });

  it('closes when the anchor scrolls out of view', () => {
    anchorRect = rect(500, 100, 26, 26);
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    anchorRect = rect(500, -200, 26, 26);
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalled();
  });

  it('follows the anchor while it stays visible', () => {
    anchorRect = rect(500, 100, 26, 26);
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    anchorRect = rect(500, 150, 26, 26);
    fireEvent.scroll(window);
    expect(onClose).not.toHaveBeenCalled();
    expect(menu().style.top).toBe('180px');
  });

  it('uses the top layer when the Popover API exists', () => {
    anchorRect = rect(500, 100, 26, 26);
    const show = vi.fn();
    const hide = vi.fn();
    (HTMLElement.prototype as unknown as Record<string, unknown>).showPopover = show;
    (HTMLElement.prototype as unknown as Record<string, unknown>).hidePopover = hide;
    try {
      const { unmount } = render(<Harness />);
      expect(menu().getAttribute('popover')).toBe('manual');
      expect(show).toHaveBeenCalledTimes(1);
      unmount();
      expect(hide).toHaveBeenCalled();
    } finally {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).showPopover;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).hidePopover;
    }
  });
});
