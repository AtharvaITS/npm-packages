import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
});

class ResizeObserverStub {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    const width = Number((target as HTMLElement).dataset.testWidth ?? 1024);
    const height = Number((target as HTMLElement).dataset.testHeight ?? 600);
    this.cb(
      [{ target, contentRect: { width, height } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  (globalThis as any).ResizeObserver = ResizeObserverStub;
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
}
