import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, ItemCard, StatusBadge, TypeBadge } from '../components.jsx';
import { Search, Box, Lock, Star, Flag, Check } from '../icons.jsx';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [err, setErr] = useState('');
  const [claim, setClaim] = useState({ message: '', verification_answer: '' });
  const [showClaim, setShowClaim] = useState(false);
  const [flag, setFlag] = useState('');
  const [flagState, setFlagState] = useState('');

  const load = () => api(`/items/${id}`).then((d) => setItem(d.item)).catch((e) => setErr(e.message));
  useEffect(() => { setItem(null); load(); }, [id]);
  useEffect(() => { if (item?.is_mine && item.status === 'open') api(`/items/${id}/matches`).then((d) => setMatches(d.matches)).catch(() => {}); }, [item?.is_mine, item?.status, id]);

  if (err) return <Alert>{err}</Alert>;
  if (!item) return <p className="muted">Loading…</p>;

  const isFound = item.type === 'found';
  const submitClaim = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await api('/claims', { method: 'POST', body: { item_id: item.id, ...claim } }); nav(`/claims/${r.id}`); }
    catch (e2) { setErr(e2.message); }
  };
  const action = async (fn) => { try { await fn(); await load(); } catch (e) { setErr(e.message); } };

  return (
    <article className="detail">
      <div className="detail-img">{item.image ? <img src={item.image} alt={item.title} /> : <div className={`noimg ${item.type}`}>{isFound ? <Box /> : <Search />}<span>No photo provided</span></div>}</div>
      <div>
        <div className="row gap-s wrap"><TypeBadge type={item.type} /><StatusBadge status={item.status} />{item.urgent ? <span className="badge urgent">Urgent</span> : null}</div>
        <h1>{item.title}</h1>
        <dl className="facts">
          <dt>Category</dt><dd>{item.category}</dd>
          <dt>{isFound ? 'Found at' : 'Lost near'}</dt><dd>{item.location}{item.location_detail ? ` — ${item.location_detail}` : ''}</dd>
          <dt>Date</dt><dd>{fmtDate(item.event_date)}</dd>
          <dt>Posted by</dt><dd>{item.poster_name}</dd>
          {isFound && <><dt>Held by</dt><dd>{item.handed_to_security ? 'Handed to university security / office' : 'The finder'}</dd></>}
        </dl>
        <p className="desc">{item.description}</p>
        {item.is_mine && item.hidden_details && <div className="note"><b>Private details (only you can see):</b> {item.hidden_details}</div>}
        {!item.is_mine && item.has_hidden_details && <p className="privacy"><span className="ico"><Lock /></span><span>The finder has recorded private identifying details to verify the real owner.</span></p>}
        <Alert>{err}</Alert>

        {item.is_mine ? (
          <div className="row gap wrap">
            {item.status !== 'resolved' && <Link className="btn" to={`/items/${item.id}/edit`}>Edit</Link>}
            {item.status === 'open' && <button className="btn" onClick={() => action(() => api(`/items/${id}/resolve`, { method: 'POST' }))}>Mark as resolved</button>}
            <button className="btn danger" onClick={() => confirm('Delete this report permanently?') && api(`/items/${id}`, { method: 'DELETE' }).then(() => nav('/dashboard'))}>Delete</button>
          </div>
        ) : item.status === 'open' ? (
          user ? (
            item.my_claim ? <Link className="btn primary" to={`/claims/${item.my_claim.id}`}>View my request ({item.my_claim.status})</Link> : showClaim ? (
              <form className="card form" onSubmit={submitClaim}>
                <h3>{isFound ? 'Claim this item' : 'I may have found this'}</h3>
                <label>Message to the poster
                  <textarea required rows="3" maxLength="1000" value={claim.message} onChange={(e) => setClaim({ ...claim, message: e.target.value })} placeholder={isFound ? 'Describe why this is yours…' : 'Where did you find it? Where is it now?'} />
                </label>
                {isFound && item.has_hidden_details && (
                  <label>Ownership verification <span className="muted small">— describe identifying details NOT visible in the photo (scratches, stickers, contents…)</span>
                    <textarea required rows="3" maxLength="1000" value={claim.verification_answer} onChange={(e) => setClaim({ ...claim, verification_answer: e.target.value })} />
                  </label>
                )}
                <div className="row gap"><button className="btn primary">Send request</button><button type="button" className="btn ghost" onClick={() => setShowClaim(false)}>Cancel</button></div>
              </form>
            ) : <button className="btn primary lg" onClick={() => setShowClaim(true)}>{isFound ? 'This is mine — claim it' : 'I found this item'}</button>
          ) : <Link className="btn primary" to="/login" state={{ from: `/items/${id}` }}>Log in to {isFound ? 'claim' : 'respond'}</Link>
        ) : <p className="muted">This report is no longer open.</p>}

        {user && !item.is_mine && (
          <div className="row gap wrap tools">
            <button className="btn ghost small" onClick={() => action(() => api(`/items/${id}/favorite`, { method: 'POST' }))}><Star width={16} height={16} filled={item.favorited} /> {item.favorited ? 'Saved' : 'Save'}</button>
            {flagState === 'done' ? <span className="muted small">Thanks — a moderator will review this.</span> : flagState === 'form' ? (
              <form className="row gap" onSubmit={async (e) => { e.preventDefault(); try { await api(`/items/${id}/report`, { method: 'POST', body: { reason: flag } }); setFlagState('done'); } catch (x) { setErr(x.message); } }}>
                <input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="Why is this inappropriate?" required aria-label="Reason" /><button className="btn small">Send</button>
              </form>
            ) : <button className="btn ghost small" onClick={() => setFlagState('form')}><Flag width={16} height={16} /> Report abuse</button>}
          </div>
        )}
      </div>
      {matches.length > 0 && (
        <section className="full">
          <div className="section-head"><div><div className="eyebrow">Smart matching</div><h2>Possible matches</h2></div></div>
          <div className="grid">{matches.map((m) => (
            <div key={m.item.id}><ItemCard item={m.item} /><p className="small muted" style={{ margin: '8px 4px 0' }}>{m.score}% match · {m.reasons.join(', ')}</p></div>
          ))}</div>
        </section>
      )}
    </article>
  );
}
