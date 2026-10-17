import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { ItemCard, Empty } from '../components.jsx';
import { Search } from '../icons.jsx';

export default function Browse() {
  const [sp, setSp] = useSearchParams();
  const [meta, setMeta] = useState({ categories: [], locations: [] });
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState(sp.get('q') || '');

  useEffect(() => { api('/items/meta').then(setMeta).catch(() => {}); }, []);
  useEffect(() => {
    setData(null); setErr('');
    api(`/items?${sp.toString()}`).then(setData).catch((e) => setErr(e.message));
  }, [sp]);

  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };
  const page = +sp.get('page') || 1;

  return (
    <>
      <div className="page-title"><div><div className="eyebrow">Search</div><h1>Browse items</h1></div></div>
      <form className="filters card" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }} role="search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keywords…" aria-label="Keywords" />
        <select value={sp.get('type') || ''} onChange={(e) => set('type', e.target.value)} aria-label="Lost or found">
          <option value="">Lost &amp; found</option><option value="lost">Lost</option><option value="found">Found</option>
        </select>
        <select value={sp.get('category') || ''} onChange={(e) => set('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>{meta.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sp.get('location') || ''} onChange={(e) => set('location', e.target.value)} aria-label="Location">
          <option value="">All locations</option>{meta.locations.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sp.get('status') || ''} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option><option value="open">Open</option><option value="claimed">Claim accepted</option><option value="resolved">Returned</option>
        </select>
        <label className="small">From <input type="date" value={sp.get('from') || ''} onChange={(e) => set('from', e.target.value)} /></label>
        <label className="small">To <input type="date" value={sp.get('to') || ''} onChange={(e) => set('to', e.target.value)} /></label>
        <button className="btn primary"><Search width={16} height={16} /> Search</button>
        <button type="button" className="btn ghost" onClick={() => { setQ(''); setSp({}); }}>Clear</button>
      </form>
      {err && <p className="alert error">{err}</p>}
      {!data && !err && <div className="grid" style={{ marginTop: 20 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card" style={{ height: 300, opacity: .5 }} />)}</div>}
      {data && (data.items.length === 0 ? <Empty>No items match your search. Try fewer filters, or <a href="/report/lost">report your lost item</a>.</Empty> : (
        <>
          <p className="muted small" style={{ margin: '18px 0 12px' }}>{data.total} result{data.total !== 1 && 's'}</p>
          <div className="grid">{data.items.map((i) => <ItemCard key={i.id} item={i} />)}</div>
          {data.pages > 1 && (
            <div className="row gap center pager">
              <button className="btn" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>← Prev</button>
              <span>Page {page} of {data.pages}</span>
              <button className="btn" disabled={page >= data.pages} onClick={() => set('page', String(page + 1))}>Next →</button>
            </div>
          )}
        </>
      ))}
    </>
  );
}
