import { describe, expect, it } from 'vitest';
import { generateEmployees } from './generate';
import { sample50 } from './sample-50';

describe('fixed Sample Dataset (FR-049, FR-050)', () => {
  it('has exactly 50 records with ids EMP-001…EMP-050 in order', () => {
    expect(sample50).toHaveLength(50);
    expect(sample50.map((e) => e.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => `EMP-${String(i + 1).padStart(3, '0')}`),
    );
    expect(new Set(sample50.map((e) => e.id)).size).toBe(50);
  });

  it('covers every field type', () => {
    const first = sample50[0]!;
    expect(typeof first.name).toBe('string');
    expect(typeof first.salary).toBe('number');
    expect(typeof first.bonusPct).toBe('number');
    expect(typeof first.active).toBe('boolean');
    expect(first.startDate).toBeInstanceOf(Date);
    expect(first.avatar.startsWith('data:image/svg+xml')).toBe(true);
    expect(first.address).toEqual({ city: expect.any(String), country: expect.any(String) });
  });

  it('has 6 departments and exactly one missing rating', () => {
    expect(new Set(sample50.map((e) => e.department)).size).toBe(6);
    expect(sample50.filter((e) => e.rating === null)).toHaveLength(1);
  });

  it('includes irregular values: long, empty, markup-like and non-Latin text', () => {
    expect(sample50.some((e) => e.bio.length > 500)).toBe(true);
    expect(sample50.some((e) => e.bio === '')).toBe(true);
    expect(sample50.some((e) => e.bio === '<b>bold</b> & <script>')).toBe(true);
    expect(sample50.filter((e) => /[^\x00-\x7F]/.test(e.name)).length).toBeGreaterThanOrEqual(2);
  });

  it('is frozen and identical on every import', async () => {
    expect(Object.isFrozen(sample50)).toBe(true);
    const again = (await import('./sample-50')).sample50;
    expect(again.map((e) => e.name)).toEqual(sample50.map((e) => e.name));
  });

  it('generated scenarios are deterministic', () => {
    expect(generateEmployees(5).map((e) => e.name)).toEqual(
      generateEmployees(5).map((e) => e.name),
    );
  });
});
