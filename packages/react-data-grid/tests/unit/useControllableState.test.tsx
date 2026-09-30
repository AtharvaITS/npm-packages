import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState } from '../../src/state/useControllableState';

describe('useControllableState', () => {
  it('uncontrolled: starts from default, updates internally and reports changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 1, onChange }),
    );
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
    expect(result.current[2]).toBe(false);
  });

  it('controlled: ignores internal sets but still calls onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: 5, defaultValue: 1, onChange }),
    );
    act(() => result.current[1](9));
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(9);
    expect(result.current[2]).toBe(true);
  });

  it('follows the controlled value when the prop changes', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useControllableState({ value: v, defaultValue: 0 }),
      {
        initialProps: { v: 1 as number | undefined },
      },
    );
    rerender({ v: 3 });
    expect(result.current[0]).toBe(3);
    // Switching to uncontrolled uses the internal value (the default).
    rerender({ v: undefined });
    expect(result.current[0]).toBe(0);
  });

  it('composes functional updates in the same tick and skips no-op changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 0, onChange }),
    );
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    act(() => result.current[1](2));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('silent sets do not call onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 'a', onChange }),
    );
    act(() => result.current[1]('b', { silent: true }));
    expect(result.current[0]).toBe('b');
    expect(onChange).not.toHaveBeenCalled();
  });
});
