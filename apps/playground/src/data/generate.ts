import type { Employee } from './sample-50';

/** Small deterministic PRNG, so generated scenarios are identical on every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
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
  'Ethan',
  'Ava',
  'Yuki',
  'Chloé',
  'Mateo',
  'Isabella',
  'Oliver',
  'Amelia',
  'Priya',
  'Henry',
  'Zoë',
  'Hana',
  'Aisha',
  'Ömer',
  'Nadia',
];
const LAST = [
  'Sharma',
  'Johnson',
  'Álvarez',
  'Wang',
  'Smith',
  'Brown',
  'Williams',
  'Martínez',
  'Müller',
  'Dubois',
  'Davis',
  'Wilson',
  'Tanaka',
  'Lefèvre',
  'Rossi',
  'Garcia',
  'Taylor',
  'Kim',
  'Patel',
  'Thomas',
  'Bello',
  'Yılmaz',
  'Petrova',
];
const DEPARTMENTS: Employee['department'][] = [
  'Engineering',
  'Design',
  'Sales',
  'Marketing',
  'Finance',
  'Operations',
];
const ROLES = [
  'Engineer',
  'Designer',
  'Manager',
  'Analyst',
  'Specialist',
  'Lead',
  'Director',
  'Coordinator',
];
const CITIES: [string, string][] = [
  ['London', 'United Kingdom'],
  ['Berlin', 'Germany'],
  ['Tokyo', 'Japan'],
  ['Austin', 'United States'],
  ['Madrid', 'Spain'],
  ['Mumbai', 'India'],
  ['Toronto', 'Canada'],
  ['Sydney', 'Australia'],
  ['Lagos', 'Nigeria'],
  ['Seoul', 'South Korea'],
  ['Paris', 'France'],
  ['São Paulo', 'Brazil'],
];

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

/** Employee-shaped records; ids GEN-000001… (no avatars, to keep 100k rows light). */
export function generateEmployees(count: number, seed = 20260925): Employee[] {
  const rand = mulberry32(seed);
  const out: Employee[] = new Array(count);
  const base = new Date(2010, 0, 1).getTime();
  const span = new Date(2026, 0, 1).getTime() - base;
  for (let i = 0; i < count; i++) {
    const first = pick(rand, FIRST);
    const last = pick(rand, LAST);
    const [city, country] = pick(rand, CITIES);
    const department = pick(rand, DEPARTMENTS);
    out[i] = {
      id: 'GEN-' + String(i + 1).padStart(6, '0'),
      name: `${first} ${last}`,
      email: `${first}.${last}.${i + 1}@example.com`
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase(),
      avatar: '',
      department,
      role: `${department} ${pick(rand, ROLES)}`,
      salary: Math.round(50000 + rand() * 150000),
      bonusPct: Math.round(rand() * 30) / 100,
      active: rand() > 0.15,
      startDate: new Date(base + Math.floor(rand() * span)),
      rating: rand() < 0.05 ? null : 1 + Math.floor(rand() * 5),
      address: { city, country },
      bio: rand() < 0.1 ? '' : `Works in ${department.toLowerCase()} from ${city}.`,
    };
  }
  return out;
}

/** A wide dataset: `rows` × `cols` fields named field001… of mixed types. */
export function generateWide(rows = 30, cols = 120, seed = 20260925): Record<string, unknown>[] {
  const rand = mulberry32(seed);
  const out: Record<string, unknown>[] = [];
  for (let r = 0; r < rows; r++) {
    const row: Record<string, unknown> = { id: `W-${r + 1}` };
    for (let c = 1; c <= cols; c++) {
      const key = 'field' + String(c).padStart(3, '0');
      switch (c % 4) {
        case 0:
          row[key] = Math.round(rand() * 10000) / 100;
          break;
        case 1:
          row[key] = `Text ${r + 1}.${c}`;
          break;
        case 2:
          row[key] = rand() > 0.5;
          break;
        default:
          row[key] = new Date(2020, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27));
      }
    }
    out.push(row);
  }
  return out;
}
