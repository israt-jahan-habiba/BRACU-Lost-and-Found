import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { Alert } from '../components.jsx';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); setErr(''); try { await login(f.email, f.password); nav(loc.state?.from || '/dashboard', { replace: true }); } catch (x) { setErr(x.message); } };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <div className="auth-head"><div className="logo" aria-hidden="true">B</div><h1>Welcome back</h1><p>Log in to manage your reports and claims.</p></div><Alert>{err}</Alert>
      <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@g.bracu.ac.bd" /></label>
      <label>Password<input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      <button className="btn primary lg">Log in</button>
      <p className="small muted" style={{ textAlign: 'center', margin: 0 }}><Link to="/forgot">Forgot password?</Link> · <Link to="/register">Create an account</Link></p>
    </form>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', student_id: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setErr(''); try { await register(f); nav('/dashboard', { replace: true }); } catch (x) { setErr(x.message); } };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <div className="auth-head"><div className="logo" aria-hidden="true">B</div><h1>Create your account</h1><p>Join your campus community in under a minute.</p></div><Alert>{err}</Alert>
      <label>Full name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
      <label>BRACU email<input type="email" required value={f.email} onChange={set('email')} placeholder="you@g.bracu.ac.bd" autoComplete="email" /></label>
      <label>Student ID <span className="muted small">(optional, kept private)</span><input value={f.student_id} onChange={set('student_id')} /></label>
      <label>Password<input type="password" required minLength="8" value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
      <button className="btn primary lg">Sign up</button>
      <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Already registered? <Link to="/login">Log in</Link></p>
    </form>
  );
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); try { await api('/auth/forgot', { method: 'POST', body: { email } }); setDone(true); } catch (x) { setErr(x.message); } };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <div className="auth-head"><div className="logo" aria-hidden="true">B</div><h1>Forgot password?</h1><p>Enter your email and we'll send a reset link.</p></div><Alert>{err}</Alert>
      {done ? <Alert kind="ok">If that email exists, a reset link has been sent. <Link to="/reset">Have a token? Reset here.</Link></Alert> : (
        <><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><button className="btn primary">Send reset link</button></>
      )}
    </form>
  );
}

export function Reset() {
  const [sp] = useSearchParams(); const nav = useNavigate();
  const [f, setF] = useState({ token: sp.get('token') || '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); try { await api('/auth/reset', { method: 'POST', body: f }); nav('/login'); } catch (x) { setErr(x.message); } };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <div className="auth-head"><div className="logo" aria-hidden="true">B</div><h1>Reset password</h1><p>Choose a new password for your account.</p></div><Alert>{err}</Alert>
      <label>Reset token<input required value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} /></label>
      <label>New password<input type="password" required minLength="8" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></label>
      <button className="btn primary">Reset password</button>
    </form>
  );
}
