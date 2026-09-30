import { describe, expect, it } from 'vitest';
import {
  addRange,
  headerState,
  pruneSelection,
  selectAll,
  selectRange,
  toggle,
} from '../../src/core/selection';

const ids = ['a', 'b', 'c', 'd', 'e'];

describe('selection rules', () => {
  it('single mode replaces the selection and never holds more than one id', () => {
    expect(toggle([], 'a', 'single')).toEqual(['a']);
    expect(toggle(['a'], 'b', 'single')).toEqual(['b']);
    expect(toggle(['b'], 'b', 'single')).toEqual([]);
  });

  it('multi mode toggles individual ids', () => {
    expect(toggle(['a'], 'b', 'multi')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a', 'multi')).toEqual(['b']);
  });

  it('none mode never selects', () => {
    expect(toggle(['a'], 'b', 'none')).toEqual([]);
  });

  it('selects a range in the current display order, skipping non-selectable ids', () => {
    const order = ['e', 'c', 'a', 'd', 'b'];
    expect(selectRange(order, 'c', 'd')).toEqual(['c', 'a', 'd']);
    expect(selectRange(order, 'd', 'c', (id) => id !== 'a')).toEqual(['c', 'd']);
    expect(selectRange(order, null, 'd')).toEqual(['d']);
    expect(addRange(['x', 'c'], ['c', 'a'])).toEqual(['x', 'c', 'a']);
  });

  it('select all covers every selectable id in the filtered result', () => {
    expect(selectAll(ids, (id) => id !== 'c')).toEqual(['a', 'b', 'd', 'e']);
  });

  it('prunes ids that no longer exist and keeps identity when unchanged', () => {
    const sel = ['a', 'z', 'c'];
    expect(pruneSelection(sel, new Set(ids))).toEqual(['a', 'c']);
    const same = ['a'];
    expect(pruneSelection(same, new Set(ids))).toBe(same);
  });

  it('computes the header checkbox state', () => {
    expect(headerState(new Set(), ids)).toBe('none');
    expect(headerState(new Set(['a']), ids)).toBe('some');
    expect(headerState(new Set(ids), ids)).toBe('all');
    expect(headerState(new Set(['a']), [])).toBe('none');
  });
});
