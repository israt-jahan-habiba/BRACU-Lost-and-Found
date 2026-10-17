import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, StatusBadge } from '../components.jsx';
import { Send, Check } from '../icons.jsx';

export default function ClaimPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const end = useRef(null);

  const load = () => api(`/claims/${id}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [d?.messages?.length]);

  if (err && !d) return <Alert>{err}</Alert>;
  if (!d) return <p className="muted">Loading…</p>;
  const { claim, item, messages, is_owner } = d;
  const act = (a) => async () => { try { setErr(''); await api(`/claims/${id}/${a}`, { method: 'POST' }); await load(); } catch (e) { setErr(e.message); } };
  const send = async (e) => { e.preventDefault(); if (!text.trim()) return; try { await api(`/claims/${id}/messages`, { method: 'POST', body: { body: text } }); setText(''); load(); } catch (e2) { setErr(e2.message); } };
  const closed = ['rejected', 'cancelled'].includes(claim.status);

  return (
    <div className="claim">
      <p><Link to="/dashboard">← Dashboard</Link></p>
      <div className="card row gap">
        {item.image && <img className="mini" src={item.image} alt="" />}
        <div><h2><Link to={`/items/${item.id}`}>{item.title}</Link></h2>
          <p className="muted small">{item.type === 'found' ? 'Found' : 'Lost'} item · {item.location} · {fmtDate(item.event_date)}</p>
          <StatusBadge status={claim.status} /></div>
      </div>
      <Alert>{err}</Alert>
      <section className="card">
        <h3>{is_owner ? `Request from ${claim.claimant_name}` : 'Your request'}</h3>
        <p>{claim.message}</p>
        {claim.verification_answer && <div className="note"><b>Ownership details provided:</b> {claim.verification_answer}</div>}
        {is_owner && item.hidden_details && <div className="note ok"><b>Your private details (compare):</b> {item.hidden_details}</div>}
        <div className="row gap wrap">
          {is_owner && claim.status === 'pending' && <><button className="btn primary" onClick={act('accept')}>Accept request</button><button className="btn danger" onClick={act('reject')}>Reject</button></>}
          {claim.status === 'accepted' && <button className="btn primary" onClick={() => confirm('Confirm that the item was handed over?') && act('confirm')()}><Check width={16} height={16} /> Confirm handover</button>}
          {!is_owner && ['pending', 'accepted'].includes(claim.status) && <button className="btn ghost" onClick={act('cancel')}>Cancel request</button>}
        </div>
        {claim.status === 'accepted' && <p className="muted small">Arrange a public meeting spot on campus (e.g. security desk or library entrance) in the chat below.</p>}
        {claim.status === 'completed' && <p>Handover complete. Thank you for helping a fellow student!</p>}
      </section>
      <section className="card chat">
        <h3>Messages</h3>
        <div className="msgs" aria-live="polite">
          {messages.length === 0 && <p className="muted small">No messages yet.</p>}
          {messages.map((m) => <div key={m.id} className={`msg ${m.sender_id === user.id ? 'me' : ''}`}><span className="small muted">{m.sender_name}</span><p>{m.body}</p></div>)}
          <div ref={end} />
        </div>
        {!closed ? <form className="row gap" onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} maxLength="1000" placeholder="Write a message…" aria-label="Message" /><button className="btn primary"><Send width={16} height={16} /> Send</button></form> : <p className="muted small">This conversation is closed.</p>}
      </section>
    </div>
  );
}
