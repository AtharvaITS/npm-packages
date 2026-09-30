/**
 * Data pipeline performance (SC-002: 10k rows < 500 ms; SC-004: 100k rows < 1500 ms).
 * Each operation reports the median of 5 runs. Set PERF_FACTOR (e.g. 2) to relax
 * the budgets on slow CI machines. Run on its own with: npm run bench
 */
import { describe, expect, it } from 'vitest';
import { resolveColumns } from '../../src/core/columns';
import { runPipeline, type PipelineInput } from '../../src/core/pipeline';

const FACTOR = Number(process.env.PERF_FACTOR ?? 1) || 1;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  'Aarav',
  'Emma',
  'José',
  'Li',
  'Liam',
  'Olivia',
  'Noah',
  'Sofía',
  'Lucas',
  'Mia',
  'Zoë',
  'Ömer',
];
const DEPTS = ['Engineering', 'Design', 'Sales', 'Marketing', 'Finance', 'Operations'];

function generate(count: number) {
  const rand = mulberry32(20260925);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `${NAMES[Math.floor(rand() * NAMES.length)]} ${NAMES[Math.floor(rand() * NAMES.length)]} ${i}`,
    department: DEPTS[Math.floor(rand() * DEPTS.length)],
    salary: Math.round(50000 + rand() * 150000),
    start: new Date(
      2010 + Math.floor(rand() * 16),
      Math.floor(rand() * 12),
      1 + Math.floor(rand() * 27),
    ),
    active: rand() > 0.2,
  }));
}

function median(fn: () => void, runs = 5): number {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(runs / 2)]!;
}

type Op = [name: string, input: Omit<PipelineInput<any>, 'rows' | 'columns'>];
const ops: Op[] = [
  [
    'sort by name (text)',
    { search: '', filters: [], sort: [{ columnId: 'name', direction: 'asc' }], locale: 'en-US' },
  ],
  [
    'sort by salary (number)',
    { search: '', filters: [], sort: [{ columnId: 'salary', direction: 'desc' }] },
  ],
  ['search "jose" (accent-insensitive)', { search: 'jose', filters: [], sort: [] }],
  [
    'filter salary between + department in',
    {
      search: '',
      filters: [
        { columnId: 'salary', operator: 'between', value: 80000, value2: 120000 },
        { columnId: 'department', operator: 'in', value: ['Sales', 'Design'] },
      ],
      sort: [],
    },
  ],
  [
    'search + filter + multi-sort',
    {
      search: 'a',
      filters: [{ columnId: 'active', operator: 'isTrue' }],
      sort: [
        { columnId: 'department', direction: 'asc' },
        { columnId: 'start', direction: 'desc' },
      ],
      locale: 'en-US',
    },
  ],
];

for (const [size, budget] of [
  [10_000, 500],
  [100_000, 1500],
] as const) {
  describe(`${size.toLocaleString('en-US')} rows (budget ${budget * FACTOR} ms)`, () => {
    const rows = generate(size);
    const columns = resolveColumns(undefined, rows);
    for (const [name, input] of ops) {
      it(name, () => {
        const ms = median(() => runPipeline({ rows, columns, ...input }));
        console.log(`[perf] ${size} rows · ${name}: ${ms.toFixed(1)} ms`);
        expect(ms).toBeLessThan(budget * FACTOR);
      });
    }
  });
}
