import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ItemCard, Empty } from '../components.jsx';
import { Search, Arrow, Box, Sparkle, Shield, Chat, Check, Lock, Eye } from '../icons.jsx';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  useEffect(() => {
    api('/stats').then(setStats).catch(() => {});
    api('/items?status=open').then((d) => setItems(d.items.slice(0, 6))).catch(() => setItems([]));
  }, []);
  return (
    <>
      <section className="hero">
        <div className="pill">BRAC University · Lost &amp; Found</div>
        <h1>Lost something on campus? <em>We&rsquo;ll help it find its way home.</em></h1>
        <p className="lead">Report it, search it, and return it to its owner, safely and without ever sharing your phone number.</p>
        <form className="search" onSubmit={(e) => { e.preventDefault(); nav(`/browse?q=${encodeURIComponent(q)}`); }} role="search">
          <span className="ico"><Search /></span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wallet, ID card, charger…" aria-label="Search items" />
          <button className="btn primary">Search</button>
        </form>
        <div className="row gap center wrap">
          <Link className="btn lg lost" to="/report/lost"><Search /> I lost something</Link>
          <Link className="btn lg found" to="/report/found"><Box /> I found something</Link>
        </div>
        {stats && (
          <div className="stats">
            <div><b>{stats.lost}</b><span>open lost reports</span></div>
            <div><b>{stats.found}</b><span>open found reports</span></div>
            <div><b>{stats.returned}</b><span>items returned</span></div>
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-head"><div><div className="eyebrow">Latest</div><h2>Recent reports</h2></div><Link to="/browse">See all <Arrow width={16} height={16} /></Link></div>
        {items === null ? <p className="muted">Loading…</p> : items.length === 0 ? <Empty>No reports yet. Be the first to post one.</Empty> : <div className="grid">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div>}
      </section>
      <section className="section how">
        <div className="section-head"><div><div className="eyebrow">Simple process</div><h2>How it works</h2></div></div>
        <ol className="steps">
          <li><span className="step-n">i.</span><div className="step-ico"><Box /></div><b>Report</b>Post a lost or found item with a photo and campus location.</li>
          <li><span className="step-n">ii.</span><div className="step-ico"><Sparkle /></div><b>Match</b>Search, or let smart matching suggest likely pairs.</li>
          <li><span className="step-n">iii.</span><div className="step-ico"><Shield /></div><b>Verify</b>Claimants describe hidden details only the real owner would know.</li>
          <li><span className="step-n">iv.</span><div className="step-ico"><Check /></div><b>Hand over</b>Chat in-app, meet on campus, and confirm the return.</li>
        </ol>
      </section>
      <section className="trust" aria-label="Safety">
        <div><div className="step-ico"><Lock /></div><p style={{ margin: 0 }}><b>Private by design</b><span>No phone numbers, emails or student IDs on public posts.</span></p></div>
        <div><div className="step-ico"><Chat /></div><p style={{ margin: 0 }}><b>In-app chat</b><span>Coordinate the handover without leaving the platform.</span></p></div>
        <div><div className="step-ico"><Eye /></div><p style={{ margin: 0 }}><b>Moderated</b><span>Suspicious posts get reviewed by campus moderators.</span></p></div>
      </section>
    </>
  );
}
