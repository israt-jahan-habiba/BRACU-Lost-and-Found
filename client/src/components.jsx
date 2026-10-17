import { Link } from 'react-router-dom';
import { fmtDate } from './api.js';
import { Search, Box, Pin, Calendar } from './icons.jsx';

export function StatusBadge({ status }) {
  const label = { open: 'Open', claimed: 'Claim accepted', resolved: 'Returned', removed: 'Removed', pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled' }[status] || status;
  return <span className={`badge s-${status}`}>{label}</span>;
}

export function TypeBadge({ type }) {
  return <span className={`badge t-${type}`}>{type === 'lost' ? 'Lost' : 'Found'}</span>;
}

export function ItemCard({ item }) {
  return (
    <Link to={`/items/${item.id}`} className="card item-card">
      <div className="thumb">
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <div className={`ph ${item.type}`}>{item.type === 'lost' ? <Search /> : <Box />}</div>}
        <div className="badges">
          <TypeBadge type={item.type} />
          {item.urgent ? <span className="badge urgent">Urgent</span> : null}
          {item.status !== 'open' && <StatusBadge status={item.status} />}
        </div>
      </div>
      <div className="item-body">
        <h3>{item.title}</h3>
        <div className="meta"><span className="ico"><Pin /></span>{item.location}</div>
        <div className="meta"><span className="ico"><Calendar /></span>{item.type === 'lost' ? 'Lost' : 'Found'} on {fmtDate(item.event_date)} · {item.category}</div>
      </div>
    </Link>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
