import { useCallback, useRef, useState } from 'react';

export type SetState<T> = (next: T | ((prev: T) => T), options?: { silent?: boolean }) => void;

/**
 * Standard controlled/uncontrolled state (research R9).
 * - Controlled when `value !== undefined`: internal sets are ignored, but
 *   `onChange` still fires so the host can decide.
 * - Uncontrolled otherwise, starting from `defaultValue`.
 * `onChange` fires on every requested change in both modes, unless `silent`.
 */
export function useControllableState<T>(params: {
  value: T | undefined;
  defaultValue: T | (() => T);
  onChange?: (value: T) => void;
}): [T, SetState<T>, boolean] {
  const { value, defaultValue, onChange } = params;
  const [internal, setInternal] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : internal;

  const currentRef = useRef(current);
  const controlledRef = useRef(controlled);
  const onChangeRef = useRef(onChange);
  // Sync with the latest render; sets within the same tick compose on top of it.
  currentRef.current = current;
  controlledRef.current = controlled;
  onChangeRef.current = onChange;

  const set = useCallback<SetState<T>>((next, options) => {
    const prev = currentRef.current;
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : (next as T);
    if (Object.is(resolved, prev)) return;
    currentRef.current = resolved;
    if (!controlledRef.current) setInternal(resolved);
    if (!options?.silent) onChangeRef.current?.(resolved);
  }, []);

  return [current, set, controlled];
}
