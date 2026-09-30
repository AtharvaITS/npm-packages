import type { ListItemContext } from '@atharvaits/react-data-grid';
import type { Employee } from '../data/sample-50';
import { StatusBadge } from './StatusBadge';

/** Custom list item layout example (renderListItem). */
export function EmployeeListItem({ row }: ListItemContext<Employee>) {
  return (
    <div className="pg-list-item">
      {row.avatar ? (
        <img className="pg-list-avatar" src={row.avatar} alt="" />
      ) : (
        <div className="pg-list-avatar" />
      )}
      <div className="pg-list-text">
        <strong>{row.name}</strong>
        <span className="pg-muted">
          {row.role} · {row.email}
        </span>
      </div>
      <StatusBadge active={row.active} />
    </div>
  );
}
