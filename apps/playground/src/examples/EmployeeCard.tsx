import type { CardContext } from '@atharvaits/react-data-grid';
import type { Employee } from '../data/sample-50';
import { StatusBadge } from './StatusBadge';

/** Custom card layout example (renderCard). The grid still owns focus, roles and selection. */
export function EmployeeCard({ row }: CardContext<Employee>) {
  return (
    <div className="pg-card">
      {row.avatar ? (
        <img className="pg-card-avatar" src={row.avatar} alt="" />
      ) : (
        <div className="pg-card-avatar" />
      )}
      <div className="pg-card-name">{row.name}</div>
      <div className="pg-card-role">{row.role}</div>
      <div className="pg-card-meta">
        {row.department} · {row.address.city}
      </div>
      <StatusBadge active={row.active} />
    </div>
  );
}
