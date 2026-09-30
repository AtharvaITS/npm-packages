/** Custom cell content example: a status badge for the `active` field. */
export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? 'pg-badge pg-badge-active' : 'pg-badge pg-badge-inactive'}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
