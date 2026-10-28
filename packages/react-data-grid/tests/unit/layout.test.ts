import { describe, expect, it } from 'vitest';
import { cardColumnCount } from '../../src/views/grid/GridView';

describe('cardColumnCount', () => {
  it('fits as many cards as the width allows, and never fewer than one', () => {
    expect(cardColumnCount(0, 240)).toBe(1);
    expect(cardColumnCount(-20, 240)).toBe(1);
    expect(cardColumnCount(Number.NaN, 240)).toBe(1);
    expect(cardColumnCount(100, 240)).toBe(1);
    expect(cardColumnCount(1024, 240)).toBe(4);
    expect(cardColumnCount(496, 240)).toBe(2);
    expect(cardColumnCount(800, 0)).toBe(48);
    expect(cardColumnCount(200, 100, 0)).toBe(2);
  });
});
