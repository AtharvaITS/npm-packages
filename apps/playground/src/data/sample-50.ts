/**
 * The fixed Sample Dataset (FR-049, FR-050, data model §12).
 * 50 hand-written employee records, always identical in content and order.
 * Do not generate, shuffle or randomize these.
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: 'Engineering' | 'Design' | 'Sales' | 'Marketing' | 'Finance' | 'Operations';
  role: string;
  salary: number;
  bonusPct: number;
  active: boolean;
  startDate: Date;
  rating: number | null;
  address: { city: string; country: string };
  bio: string;
}

const COLORS = ['#2453c9', '#0f7b6c', '#b54708', '#7a2ec9', '#c01048', '#344054'];

/** Initials on a coloured circle as an inline SVG data URI (works offline). */
function avatar(name: string, index: number): string {
  const initials = name
    .split(/\s+/)
    .map((part) => Array.from(part)[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = COLORS[index % COLORS.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="48" fill="${color}"/>` +
    `<text x="48" y="58" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function email(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('.');
  return (ascii || 'employee') + '@example.com';
}

type Row = [
  id: string,
  name: string,
  department: Employee['department'],
  role: string,
  salary: number,
  bonusPct: number,
  active: boolean,
  startDate: string,
  rating: number | null,
  city: string,
  country: string,
  bio: string,
];

const LONG_BIO =
  'Aarav has spent the last decade building data platforms for companies of every size, from two-person startups to global enterprises. ' +
  'He led the migration of a nightly batch pipeline to a streaming architecture that cut reporting delays from twelve hours to under five minutes, ' +
  'mentored more than twenty engineers, and regularly speaks at meetups about observability, schema evolution and pragmatic testing. ' +
  'Outside work he restores vintage bicycles, volunteers at a coding club for teenagers on weekends, and is slowly working through every recipe in a very old French cookbook. ' +
  'This deliberately long biography exists so the Playground always shows how long text is truncated with an ellipsis and revealed in full on hover or keyboard focus.';

// prettier-ignore
const ROWS: Row[] = [
  ['EMP-001', 'Aarav Sharma', 'Engineering', 'Staff Engineer', 168000, 0.15, true, '2016-03-14', 5, 'Bengaluru', 'India', LONG_BIO],
  ['EMP-002', 'Emma Johnson', 'Design', 'Product Designer', 112000, 0.08, true, '2019-07-01', 4, 'London', 'United Kingdom', 'Designs calm, accessible interfaces.'],
  ['EMP-003', 'José Álvarez', 'Sales', 'Account Executive', 94000, 0.22, true, '2020-01-20', 4, 'Madrid', 'Spain', 'Top closer three quarters running.'],
  ['EMP-004', '李 娜', 'Engineering', 'Frontend Engineer', 131000, 0.1, true, '2018-11-05', 5, 'Shanghai', 'China', 'Loves performance budgets and typed APIs.'],
  ['EMP-005', 'Liam Smith', 'Finance', 'Financial Analyst', 88000, 0.05, false, '2015-06-30', 3, 'Toronto', 'Canada', ''],
  ['EMP-006', 'Olivia Brown', 'Marketing', 'Content Lead', 99000, 0.07, true, '2021-02-15', 4, 'Sydney', 'Australia', 'Writes the product newsletter.'],
  ['EMP-007', 'Noah Williams', 'Operations', 'Operations Manager', 105000, 0.09, true, '2017-09-12', 3, 'Chicago', 'United States', 'Keeps every process running on time.'],
  ['EMP-008', 'Sofía Martínez', 'Design', 'UX Researcher', 97000, 0.06, true, '2022-04-04', 4, 'Mexico City', 'Mexico', 'Runs weekly usability studies.'],
  ['EMP-009', 'Lucas Müller', 'Engineering', 'Backend Engineer', 124000, 0.1, true, '2019-01-28', 4, 'Berlin', 'Germany', 'Owns the billing service.'],
  ['EMP-010', 'Mia Dubois', 'Marketing', 'Brand Manager', 102000, 0.08, false, '2016-10-17', 3, 'Paris', 'France', '<b>bold</b> & <script>'],
  ['EMP-011', 'Ethan Davis', 'Sales', 'Sales Director', 176000, 0.25, true, '2014-05-19', 5, 'New York', 'United States', 'Built the enterprise sales team.'],
  ['EMP-012', 'Ava Wilson', 'Finance', 'Controller', 142000, 0.12, true, '2013-08-26', 4, 'Boston', 'United States', 'Closes the books in three days.'],
  ['EMP-013', 'Yuki Tanaka', 'Engineering', 'Mobile Engineer', 128000, 0.1, true, '2020-06-08', 4, 'Tokyo', 'Japan', 'Ships the iOS and Android apps.'],
  ['EMP-014', 'Chloé Lefèvre', 'Design', 'Design Director', 158000, 0.14, true, '2015-02-02', 5, 'Lyon', 'France', 'Leads the design system.'],
  ['EMP-015', 'Mateo Rossi', 'Operations', 'Logistics Coordinator', 67000, 0.04, true, '2023-01-09', 3, 'Milan', 'Italy', 'Coordinates shipping across Europe.'],
  ['EMP-016', 'Isabella Garcia', 'Sales', 'Sales Engineer', 118000, 0.18, true, '2018-03-21', 4, 'Austin', 'United States', 'Runs technical demos.'],
  ['EMP-017', 'Oliver Taylor', 'Engineering', 'Engineering Manager', 172000, 0.15, true, '2012-11-13', 4, 'Seattle', 'United States', 'Manages the platform team.'],
  ['EMP-018', 'Amelia Anderson', 'Marketing', 'Growth Marketer', 93000, 0.09, true, '2021-09-27', null, 'Denver', 'United States', 'Runs lifecycle campaigns.'],
  ['EMP-019', 'Priya Patel', 'Finance', 'FP&A Manager', 128000, 0.11, true, '2017-04-10', 5, 'Mumbai', 'India', 'Owns the annual plan.'],
  ['EMP-020', 'Henry Thomas', 'Operations', 'Facilities Lead', 72000, 0.03, false, '2011-07-05', 2, 'Dublin', 'Ireland', 'Retired the old office lease.'],
  ['EMP-021', 'Zoë van Dijk', 'Design', 'Visual Designer', 89000, 0.05, true, '2022-10-03', 3, 'Amsterdam', 'Netherlands', 'Illustrates onboarding flows.'],
  ['EMP-022', 'Benjamin Moore', 'Engineering', 'DevOps Engineer', 126000, 0.1, true, '2019-12-02', 4, 'Portland', 'United States', 'Automates everything twice.'],
  ['EMP-023', 'Hana Kim', 'Engineering', 'Data Engineer', 134000, 0.11, true, '2020-08-17', 5, 'Seoul', 'South Korea', 'Maintains the event pipeline.'],
  ['EMP-024', 'Elijah Jackson', 'Sales', 'Account Manager', 86000, 0.16, true, '2021-05-24', 3, 'Atlanta', 'United States', 'Renews the largest accounts.'],
  ['EMP-025', 'Charlotte White', 'Marketing', 'Marketing Director', 165000, 0.15, true, '2014-01-13', 5, 'San Francisco', 'United States', 'Leads brand and demand.'],
  ['EMP-026', 'Ömer Yılmaz', 'Operations', 'Supply Planner', 78000, 0.05, true, '2019-03-11', 4, 'Istanbul', 'Turkey', 'Forecasts inventory needs.'],
  ['EMP-027', 'Harper Harris', 'Finance', 'Accountant', 74000, 0.04, true, '2022-02-28', 3, 'Phoenix', 'United States', 'Handles payables.'],
  ['EMP-028', 'Alexander Martin', 'Engineering', 'Security Engineer', 149000, 0.12, true, '2016-06-06', 5, 'Washington', 'United States', 'Runs the bug bounty program.'],
  ['EMP-029', 'Fatima Al-Sayed', 'Design', 'Content Designer', 95000, 0.06, true, '2020-11-16', 4, 'Dubai', 'United Arab Emirates', 'Writes clear interface copy.'],
  ['EMP-030', 'Daniel Thompson', 'Sales', 'Sales Development Rep', 62000, 0.2, true, '2024-01-15', 3, 'Dallas', 'United States', 'Books the most meetings.'],
  ['EMP-031', 'Evelyn Garcia', 'Operations', 'Program Manager', 113000, 0.08, true, '2018-09-04', 4, 'San Diego', 'United States', 'Runs cross-team launches.'],
  ['EMP-032', 'Matthew Clark', 'Engineering', 'QA Engineer', 98000, 0.07, false, '2015-12-07', 3, 'Raleigh', 'United States', 'Wrote the end-to-end suite.'],
  ['EMP-033', 'Ingrid Johansson', 'Finance', 'Tax Specialist', 104000, 0.06, true, '2019-05-13', 4, 'Stockholm', 'Sweden', 'Handles international tax.'],
  ['EMP-034', 'Samuel Lewis', 'Marketing', 'SEO Specialist', 81000, 0.06, true, '2021-11-22', 3, 'Nashville', 'United States', 'Grew organic traffic 40%.'],
  ['EMP-035', 'Aisha Bello', 'Engineering', 'Machine Learning Engineer', 162000, 0.13, true, '2020-02-24', 5, 'Lagos', 'Nigeria', 'Trains the ranking models.'],
  ['EMP-036', 'David Walker', 'Operations', 'IT Support', 64000, 0.03, true, '2023-06-19', 3, 'Columbus', 'United States', 'Fixes laptops with a smile.'],
  ['EMP-037', 'Grace Hall', 'Design', 'Motion Designer', 91000, 0.05, true, '2022-07-11', 4, 'Vancouver', 'Canada', 'Animates the marketing site.'],
  ['EMP-038', 'Joseph Allen', 'Sales', 'Channel Partner Manager', 121000, 0.17, true, '2017-01-30', 4, 'Miami', 'United States', 'Manages reseller partners.'],
  ['EMP-039', 'Nadia Petrova', 'Engineering', 'Site Reliability Engineer', 139000, 0.11, true, '2018-04-23', 4, 'Warsaw', 'Poland', 'Keeps uptime above 99.95%.'],
  ['EMP-040', 'Carter Young', 'Finance', 'Payroll Specialist', 69000, 0.03, true, '2021-08-09', 3, 'Kansas City', 'United States', 'Runs payroll in 12 countries.'],
  ['EMP-041', 'Lucía Fernández', 'Marketing', 'Events Manager', 87000, 0.07, true, '2019-10-14', 4, 'Buenos Aires', 'Argentina', 'Plans the annual conference.'],
  ['EMP-042', 'Wyatt King', 'Operations', 'Procurement Lead', 96000, 0.06, false, '2016-02-22', 3, 'Detroit', 'United States', 'Negotiates vendor contracts.'],
  ['EMP-043', 'Sipho Ndlovu', 'Engineering', 'Platform Engineer', 127000, 0.1, true, '2021-03-01', 4, 'Cape Town', 'South Africa', 'Builds internal tooling.'],
  ['EMP-044', 'Scarlett Wright', 'Design', 'Accessibility Specialist', 106000, 0.07, true, '2020-09-21', 5, 'Minneapolis', 'United States', 'Audits every release for WCAG.'],
  ['EMP-045', 'Jack Scott', 'Sales', 'Regional Sales Manager', 139000, 0.2, true, '2015-10-05', 4, 'Philadelphia', 'United States', 'Owns the East region.'],
  ['EMP-046', 'Elena Popescu', 'Finance', 'Treasury Analyst', 91000, 0.05, true, '2022-12-12', 3, 'Bucharest', 'Romania', 'Manages cash positions.'],
  ['EMP-047', 'Owen Green', 'Marketing', 'Product Marketing Manager', 124000, 0.1, true, '2018-06-18', 4, 'Salt Lake City', 'United States', 'Writes launch messaging.'],
  ['EMP-048', 'Leilani Kahale', 'Operations', 'Customer Success Lead', 99000, 0.08, true, '2019-08-26', 5, 'Honolulu', 'United States', 'Leads onboarding for new customers.'],
  ['EMP-049', 'Mohammed Rahman', 'Engineering', 'Principal Engineer', 198000, 0.18, true, '2011-04-18', 5, 'Dhaka', 'Bangladesh', 'Architect of the core platform.'],
  ['EMP-050', 'Victoria Baker', 'Sales', 'Customer Success Manager', 83000, 0.1, true, '2023-09-05', 4, 'Charlotte', 'United States', 'Helps customers get value fast.'],
];

export const sample50: readonly Employee[] = Object.freeze(
  ROWS.map(
    (
      [id, name, department, role, salary, bonusPct, active, start, rating, city, country, bio],
      index,
    ): Employee => {
      const [y, m, d] = start.split('-').map(Number) as [number, number, number];
      return {
        id,
        name,
        email: email(name),
        avatar: avatar(name, index),
        department,
        role,
        salary,
        bonusPct,
        active,
        startDate: new Date(y, m - 1, d),
        rating,
        address: { city, country },
        bio,
      };
    },
  ),
);
