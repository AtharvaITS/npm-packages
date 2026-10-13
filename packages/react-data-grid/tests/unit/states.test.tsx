import { describe, expect, it, vi } from 'vitest';
import { renderStateContent } from '../../src/states/States';
import type { StateContentContext } from '../../src/types';

const ctx: StateContentContext = {
  messages: { empty: 'none' } as StateContentContext['messages'],
  clearFilters: vi.fn(),
  retry: vi.fn(),
  error: new Error('load failed'),
};

describe('renderStateContent', () => {
  it('uses the fallback, a node, or a render function', () => {
    expect(renderStateContent(undefined, ctx, 'fallback')).toBe('fallback');
    expect(renderStateContent(<strong>empty</strong>, ctx, 'fallback')).toMatchObject({
      type: 'strong',
    });
    const render = vi.fn(() => 'from-fn');
    expect(renderStateContent(render, ctx, 'fallback')).toBe('from-fn');
    expect(render).toHaveBeenCalledWith(ctx);
  });
});
