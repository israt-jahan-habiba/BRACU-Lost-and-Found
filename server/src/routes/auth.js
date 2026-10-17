import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

export const authRouter = Router();
const REQUIRE_BRACU = process.env.REQUIRE_BRACU_EMAIL !== 'false';
const BRACU_RE = /@(g\.)?bracu\.ac\.bd$/i;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, student_id: u.student_id, phone: u.phone, role: u.role });

authRouter.post('/register', (req, res) => {
  const { name, email, password, student_id, phone } = req.body || {};
  if (!name?.trim() || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (REQUIRE_BRACU && !BRACU_RE.test(email)) return res.status(400).json({ error: 'Please use your BRAC University email (…@g.bracu.ac.bd)' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const lower = email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(lower)) return res.status(409).json({ error: 'An account with this email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name,email,student_id,phone,password_hash) VALUES (?,?,?,?,?)')
    .run(name.trim().slice(0, 100), lower, student_id?.trim() || null, phone?.trim() || null, hash);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'Incorrect email or password' });
  if (user.banned) return res.status(403).json({ error: 'This account has been suspended' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

authRouter.put('/me', requireAuth, (req, res) => {
  const { name, phone, student_id } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE users SET name=?, phone=?, student_id=? WHERE id=?')
    .run(name.trim().slice(0, 100), phone?.trim() || null, student_id?.trim() || null, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
});

authRouter.put('/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current || '', u.password_hash)) return res.status(400).json({ error: 'Current password is incorrect' });
  if (!next || next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(next, 10), u.id);
  res.json({ ok: true });
});

// Forgot password: no email server is bundled, so the reset link is printed to the server console.
// Replace the console.log with an email provider (e.g. Nodemailer) for production.
authRouter.post('/forgot', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE email=?').get((req.body?.email || '').trim().toLowerCase());
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    db.prepare('UPDATE users SET reset_token=?, reset_expires=? WHERE id=?').run(hash, Date.now() + 3600e3, user.id);
    console.log(`[password reset] token for ${req.body.email}: ${token}`);
  }
  res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
});

authRouter.post('/reset', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || password.length < 8) return res.status(400).json({ error: 'Valid token and a password of 8+ characters are required' });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const u = db.prepare('SELECT id FROM users WHERE reset_token=? AND reset_expires>?').get(hash, Date.now());
  if (!u) return res.status(400).json({ error: 'Reset link is invalid or expired' });
  db.prepare('UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?').run(bcrypt.hashSync(password, 10), u.id);
  res.json({ ok: true });
});
