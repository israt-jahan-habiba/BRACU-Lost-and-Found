import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { Alert, StatusBadge, TypeBadge } from '../components.jsx';

function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bars">{rows.map((r) => (
      <div key={r[label]} className="bar-row"><span className="small">{r[label]}</span><div className="bar"><i style={{ width: `${(r.count / max) * 100}%` }} /></div><b className="small">{r.count}</b></div>
    ))}{rows.length === 0 && <p className="muted small">No data yet.</p>}</div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null); const [items, setItems] = useState([]); const [users, setUsers] = useState([]); const [reports, setReports] = useState([]);
  const [err, setErr] = useState('');
  const load = () => Promise.all([
    api('/admin/stats').then(setStats), api('/admin/items').then((d) => setItems(d.items)),
    api('/admin/users').then((d) => setUsers(d.users)), api('/admin/reports').then((d) => setReports(d.reports)),
  ]).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = (path, body) => async () => { try { await api(path, { method: 'POST', body }); await load(); } catch (e) { setErr(e.message); } };

  return (
    <>
      <div className="page-title"><div><div className="eyebrow">Moderation</div><h1>Admin panel</h1></div></div><Alert>{err}</Alert>
      <div className="tabs">{[['stats', 'Analytics'], ['reports', `Flagged${reports.length ? ` (${reports.length})` : ''}`], ['items', 'All reports'], ['users', 'Users']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'stats' && stats && (
        <>
          <div className="stats wide">
            <div><b>{stats.lost}</b><span>lost reports</span></div><div><b>{stats.found}</b><span>found reports</span></div>
            <div><b>{stats.resolved}</b><span>returned</span></div><div><b>{stats.unresolved}</b><span>unresolved</span></div>
            <div><b>{stats.avg_resolution_days ?? '—'}</b><span>avg days to resolve</span></div><div><b>{stats.users}</b><span>users</span></div>
          </div>
          <div className="two-col"><div className="card"><h3>Popular categories</h3><Bars rows={stats.top_categories} label="category" /></div>
            <div className="card"><h3>Hotspot locations</h3><Bars rows={stats.top_locations} label="location" /></div></div>
        </>
      )}

      {tab === 'reports' && (reports.length === 0 ? <p className="muted">No flagged reports.</p> : reports.map((r) => (
        <div key={r.id} className="card row between wrap"><div><Link to={`/items/${r.item_id}`}><b>{r.title}</b></Link><br /><span className="small muted">“{r.reason}” — {r.reporter_name}, {fmtDate(r.created_at)}</span></div>
          <div className="row gap-s"><button className="btn small danger" onClick={run(`/admin/items/${r.item_id}/remove`)}>Remove post</button><button className="btn small" onClick={run(`/admin/reports/${r.id}/dismiss`)}>Dismiss</button></div></div>
      )))}

      {tab === 'items' && (
        <div className="table-wrap"><table><thead><tr><th>Item</th><th>Type</th><th>Poster</th><th>Status</th><th>Flags</th><th /></tr></thead><tbody>
          {items.map((i) => (<tr key={i.id}><td><Link to={`/items/${i.id}`}>{i.title}</Link></td><td><TypeBadge type={i.type} /></td><td>{i.poster_name}</td><td><StatusBadge status={i.status} /></td><td>{i.flags || ''}</td>
            <td>{i.status === 'removed' ? <button className="btn small" onClick={run(`/admin/items/${i.id}/restore`)}>Restore</button> : <button className="btn small danger" onClick={run(`/admin/items/${i.id}/remove`)}>Remove</button>}</td></tr>))}
        </tbody></table></div>
      )}

      {tab === 'users' && (
        <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Reports</th><th>Joined</th><th /></tr></thead><tbody>
          {users.map((u) => (<tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.items}</td><td>{fmtDate(u.created_at)}</td>
            <td>{u.role !== 'admin' && <button className={`btn small ${u.banned ? '' : 'danger'}`} onClick={run(`/admin/users/${u.id}/ban`, { banned: !u.banned })}>{u.banned ? 'Unban' : 'Suspend'}</button>}</td></tr>))}
        </tbody></table></div>
      )}
    </>
  );
}
