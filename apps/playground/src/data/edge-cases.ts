/** Awkward inputs for the edge-case scenarios (spec "Edge Cases"). */

/** Mix of valid rows and invalid items: null, a number, a string, an array. */
export const invalidItems: unknown[] = [
  { id: 1, name: 'Valid row one', score: 10 },
  null,
  42,
  'str',
  [1, 2],
  { id: 2, name: 'Valid row two', score: 20 },
  undefined,
  { id: 3, name: 'Valid row three', score: 30 },
];

const circular: Record<string, unknown> = { name: 'loop' };
circular.self = circular;

export const edgeCaseRows: Record<string, unknown>[] = [
  {
    id: 'a',
    name: 'Inconsistent keys',
    onlyHere: 'present only in row a',
    'key with spaces': 'spaces ok',
  },
  { id: 'b', name: 'Nested object', nested: { city: 'Oslo', zip: '0150', country: 'Norway' } },
  { id: 'c', name: 'Circular reference', nested: circular },
  { id: 'd', name: 'Not a number', score: Number.NaN },
  { id: 'e', name: 'Positive infinity', score: Number.POSITIVE_INFINITY },
  { id: 'f', name: 'Negative infinity', score: Number.NEGATIVE_INFINITY },
  { id: 'g', name: 'Big integer', big: BigInt('9007199254740993') },
  { id: 'h', name: 'Huge unbroken string', long: 'x'.repeat(10000) },
  { id: 'i', name: '<img src=x onerror=alert(1)>', note: 'Markup must render as literal text' },
  { id: 'j', name: 'Function value', fn: () => 'nope' },
  { id: 'j', name: 'Duplicate id j', score: 7 },
  {
    id: 'k',
    name: 'Dotted key',
    'a.b': 'literal dotted key',
    имя: 'non-Latin key',
    名前: 'another',
  },
  { id: 'l', name: 'Array value', tags: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] },
  { id: 'm', name: 'Empty values', score: null, note: '', nested: undefined },
];
