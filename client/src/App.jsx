import { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { api } from './api.js';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import ReportForm from './pages/ReportForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ClaimPage from './pages/ClaimPage.jsx';
import { Login, Register, Forgot, Reset } from './pages/AuthPages.jsx';
import Admin from './pages/Admin.jsx';
import Guidelines from './pages/Guidelines.jsx';
import { Bell as BellIcon, Box, Menu, X } from './icons.jsx';

function Protected({ children, admin }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function Bell() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const load = () => api('/notifications').then(setData).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  const toggle = async () => {
    setOpen(!open);
    if (!open && data.unread) { await api('/notifications/read', { method: 'POST' }); setData((d) => ({ ...d, unread: 0 })); }
  };
  return (
    <div className="bell">
      <button className="icon-btn" onClick={toggle} aria-label={`Notifications, ${data.unread} unread`}>
        <BellIcon />{data.unread > 0 && <span className="dot">{data.unread}</span>}
      </button>
      {open && (
        <div className="popover" role="menu">
          <div className="popover-head">Notifications</div>
          {data.notifications.length === 0 && <p className="muted small pad">No notifications yet.</p>}
          {data.notifications.slice(0, 8).map((n) => (
            <button key={n.id} className="notif" onClick={() => { setOpen(false); if (n.link) nav(n.link); }}>
              {n.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <header className="topbar">
        <div className="container row between">
          <Link to="/" className="brand"><span className="logo" aria-hidden="true"><Box /></span><span>BRACU<br /><b>Lost &amp; Found</b></span></Link>
          <button className="icon-btn menu-btn" onClick={() => setMenu(!menu)} aria-label="Toggle menu" aria-expanded={menu}>{menu ? <X /> : <Menu />}</button>
          <nav className={menu ? 'open' : ''} aria-label="Main">
            <NavLink to="/browse">Browse</NavLink>
            <NavLink to="/guidelines">Guidelines</NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                <Bell />
                <button className="btn ghost" onClick={() => { logout(); nav('/'); }}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/register" className="btn primary">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/report/:type" element={<Protected><ReportForm /></Protected>} />
          <Route path="/items/:id/edit" element={<Protected><ReportForm edit /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/claims/:id" element={<Protected><ClaimPage /></Protected>} />
          <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="*" element={<div className="empty" style={{ marginTop: 40 }}><h2>Page not found</h2><p>That page doesn't exist. <Link to="/">Go home</Link></p></div>} />
        </Routes>
      </main>
      <footer className="footer"><div className="container muted small"><span className="brand"><span className="logo" aria-hidden="true"><Box /></span><span>BRACU <b>Lost &amp; Found</b></span></span><span>Student project, not an official BRAC University service.</span><span>Never share sensitive documents publicly.</span></div></footer>
    </>
  );
}
