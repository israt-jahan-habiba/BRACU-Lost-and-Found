import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

function load(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const u = db.prepare('SELECT id,name,email,student_id,phone,role,banned FROM users WHERE id=?').get(id);
    return u && !u.banned ? u : null;
  } catch { return null; }
}

export function optionalAuth(req, _res, next) { req.user = load(req); next(); }
export function requireAuth(req, res, next) {
  const u = load(req);
  if (!u) return res.status(401).json({ error: 'Please log in' });
  req.user = u; next();
}
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    next();
  });
}
