import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Alert } from '../components.jsx';
import { Search, Box, Lock } from '../icons.jsx';

export default function ReportForm({ edit }) {
  const params = useParams();
  const nav = useNavigate();
  const [meta, setMeta] = useState({ categories: [], locations: [] });
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ type: params.type, title: '', category: '', description: '', location: '', location_detail: '', event_date: today, hidden_details: '', handed_to_security: false });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [dup, setDup] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/items/meta').then(setMeta); }, []);
  useEffect(() => {
    if (!edit) return;
    api(`/items/${params.id}`).then(({ item }) => setF({ ...item, location_detail: item.location_detail || '', hidden_details: item.hidden_details || '' })).catch((e) => setErr(e.message));
  }, [edit, params.id]);

  if (!edit && !['lost', 'found'].includes(params.type)) return <p>Unknown report type.</p>;
  const isFound = f.type === 'found';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const onFile = (e) => {
    const x = e.target.files[0]; setErr('');
    if (x && !['image/jpeg', 'image/png', 'image/webp'].includes(x.type)) { setErr('Only JPG, PNG or WEBP images are allowed'); e.target.value = ''; return; }
    if (x && x.size > 5 * 1024 * 1024) { setErr('Image must be 5MB or smaller'); e.target.value = ''; return; }
    setFile(x || null);
  };

  const submit = async (e, confirmDup = false) => {
    e?.preventDefault(); setErr(''); setBusy(true);
    const fd = new FormData();
    ['type', 'title', 'category', 'description', 'location', 'location_detail', 'event_date', 'hidden_details'].forEach((k) => fd.append(k, f[k] ?? ''));
    fd.append('handed_to_security', String(!!f.handed_to_security));
    if (confirmDup) fd.append('confirm_duplicate', 'true');
    if (file) fd.append('image', file);
    try {
      const r = await api(edit ? `/items/${params.id}` : '/items', { method: edit ? 'PUT' : 'POST', form: fd });
      nav(`/items/${r.item.id}`);
    } catch (e2) { if (e2.status === 409 && e2.data?.duplicate_id) setDup(e2.data.duplicate_id); else setErr(e2.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="card form narrow" onSubmit={submit}>
      <div className={`type-banner ${f.type}`}><span className="ico">{isFound ? <Box /> : <Search />}</span>{isFound ? 'Found item' : 'Lost item'}</div>
      <h1 style={{ margin: 0 }}>{edit ? 'Edit report' : isFound ? 'Report a found item' : 'Report a lost item'}</h1>
      <Alert>{err}</Alert>
      {dup && <div className="alert warn">You already have an open report with this title (<Link to={`/items/${dup}`}>view it</Link>). <button type="button" className="btn small" onClick={() => submit(null, true)}>Post anyway</button></div>}
      <label>Item name<input required maxLength="120" value={f.title} onChange={set('title')} placeholder="e.g. Black leather wallet" /></label>
      <div className="two">
        <label>Category<select required value={f.category} onChange={set('category')}><option value="">Select…</option>{meta.categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>{isFound ? 'Date found' : 'Date lost'}<input type="date" required max={today} value={f.event_date} onChange={set('event_date')} /></label>
      </div>
      <div className="two">
        <label>Campus location<select required value={f.location} onChange={set('location')}><option value="">Select…</option>{meta.locations.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Floor / room (optional)<input maxLength="200" value={f.location_detail} onChange={set('location_detail')} placeholder="e.g. 4th floor, room 4A12" /></label>
      </div>
      <label>Description<textarea required rows="4" maxLength="2000" value={f.description} onChange={set('description')} placeholder="Colour, brand, size, what's inside…" /></label>
      <label>Photo (optional, JPG/PNG/WEBP up to 5MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} /></label>
      <label>Private identifying details <span className="muted small">— {isFound ? 'only you see this. Used to verify the real owner (e.g. scratch, sticker, contents). Do not put them in the description.' : 'only you see this.'}</span>
        <textarea rows="2" maxLength="500" value={f.hidden_details} onChange={set('hidden_details')} /></label>
      {isFound && <label className="check"><input type="checkbox" checked={!!f.handed_to_security} onChange={set('handed_to_security')} /> I handed this item to university security / an office</label>}
      <div className="privacy"><span className="ico"><Lock /></span><span>Your phone number and student ID are never shown. Contact happens through in-app chat.</span></div>
      <button className="btn primary lg" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Post report'}</button>
    </form>
  );
}
