import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Empty, ItemCard, StatusBadge, TypeBadge } from '../components.jsx';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('posts');
  const [items, setItems] = useState(null);
  const [claims, setClaims] = useState({ sent: [], received: [] });
  const [favs, setFavs] = useState([]);
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '', student_id: user.student_id || '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  const load = () => {
    api('/items/mine').then((d) => setItems(d.items));
    api('/claims/mine').then(setClaims);
    api('/items/favorites').then((d) => setFavs(d.items));
  };
  useEffect(load, []);

  const resolve = async (id) => { await api(`/items/${id}/resolve`, { method: 'POST' }); load(); };
  const del = async (id) => { if (confirm('Delete this report?')) { await api(`/items/${id}`, { method: 'DELETE' }); load(); } };
  const saveProfile = async (e) => { e.preventDefault(); setErr(''); setMsg(''); try { const r = await api('/auth/me', { method: 'PUT', body: profile }); setUser(r.user); setMsg('Profile saved'); } catch (x) { setErr(x.message); } };
  const savePw = async (e) => { e.preventDefault(); setErr(''); setMsg(''); try { await api('/auth/password', { method: 'PUT', body: pw }); setPw({ current: '', next: '' }); setMsg('Password changed'); } catch (x) { setErr(x.message); } };

  const pendingIn = claims.received.filter((c) => c.status === 'pending').length;
  const tabs = [['posts', 'My reports'], ['claims', `Claims${pendingIn ? ` (${pendingIn})` : ''}`], ['saved', 'Saved'], ['settings', 'Settings']];
  const ClaimRow = ({ c, who }) => (
    <Link to={`/claims/${c.id}`} className="card row between claim-row">
      <span><TypeBadge type={c.type} /> <b>{c.title}</b><br /><span className="muted small">{who} · {fmtDate(c.created_at)}</span></span><StatusBadge status={c.status} />
    </Link>
  );

  return (
    <>
      <div className="page-title"><div><div className="eyebrow">Dashboard</div><h1 style={{ margin: 0 }}>Welcome, {user.name.split(' ')[0]}</h1></div>
        <div className="row gap"><Link className="btn lost" to="/report/lost">+ Lost</Link><Link className="btn found" to="/report/found">+ Found</Link></div></div>
      <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(''); setErr(''); }}>{l}</button>)}</div>

      {tab === 'posts' && (items === null ? <p className="muted">Loading…</p> : items.length === 0 ? <Empty>You haven't posted anything yet.</Empty> : (
        <div className="list">{items.map((i) => (
          <div key={i.id} className="card row between wrap">
            <div className="row gap"><TypeBadge type={i.type} /><div><Link to={`/items/${i.id}`}><b>{i.title}</b></Link><br /><span className="muted small">{i.category} · {fmtDate(i.event_date)}{i.pending_claims ? ` · ${i.pending_claims} pending request(s)` : ''}</span></div></div>
            <div className="row gap-s wrap"><StatusBadge status={i.status} />
              {i.status === 'open' && <button className="btn small" onClick={() => resolve(i.id)}>Mark resolved</button>}
              {i.status !== 'resolved' && <Link className="btn small" to={`/items/${i.id}/edit`}>Edit</Link>}
              <button className="btn small danger" onClick={() => del(i.id)}>Delete</button></div>
          </div>))}</div>
      ))}

      {tab === 'claims' && (
        <>
          <h3>Requests on my reports</h3>{claims.received.length === 0 ? <Empty>No requests received.</Empty> : claims.received.map((c) => <ClaimRow key={c.id} c={c} who={`from ${c.claimant_name}`} />)}
          <h3>Requests I sent</h3>{claims.sent.length === 0 ? <Empty>You haven't sent any requests.</Empty> : claims.sent.map((c) => <ClaimRow key={c.id} c={c} who={`to ${c.owner_name}`} />)}
        </>
      )}

      {tab === 'saved' && (favs.length === 0 ? <Empty>Nothing saved yet. Use ☆ Save on an item page.</Empty> : <div className="grid">{favs.map((i) => <ItemCard key={i.id} item={i} />)}</div>)}

      {tab === 'settings' && (
        <div className="two-col">
          <form className="card form" onSubmit={saveProfile}>
            <h3>Profile</h3>
            <label>Name<input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
            <label>Student ID (private)<input value={profile.student_id} onChange={(e) => setProfile({ ...profile, student_id: e.target.value })} /></label>
            <label>Phone (private)<input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
            <p className="muted small">Email: {user.email}</p><button className="btn primary">Save</button>
          </form>
          <form className="card form" onSubmit={savePw}>
            <h3>Change password</h3>
            <label>Current<input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></label>
            <label>New (8+ characters)<input type="password" required minLength="8" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></label>
            <button className="btn primary">Update password</button>
          </form>
          <div><Alert kind="ok">{msg}</Alert><Alert>{err}</Alert></div>
        </div>
      )}
    </>
  );
}
