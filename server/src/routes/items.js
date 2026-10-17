import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { db, notify } from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { CATEGORIES, LOCATIONS, URGENT_CATEGORIES, UPLOAD_DIR } from '../constants.js';
import { scoreMatch } from '../matching.js';

export const itemsRouter = Router();

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, UPLOAD_DIR),
    filename: (_r, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[f.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(Object.assign(new Error('Only JPG, PNG or WEBP images are allowed'), { status: 400 }))),
});

const BASE = `SELECT i.*, u.name AS poster_name FROM items i JOIN users u ON u.id=i.user_id`;

// Public shape: never leaks hidden_details, email, phone or student id.
export function serialize(item, viewer) {
  if (!item) return item;
  const mine = viewer && (viewer.id === item.user_id || viewer.role === 'admin');
  const { hidden_details, ...rest } = item;
  return { ...rest, urgent: !!item.urgent, handed_to_security: !!item.handed_to_security, is_mine: viewer?.id === item.user_id, ...(mine ? { hidden_details } : { has_hidden_details: !!hidden_details }) };
}

itemsRouter.get('/meta', (_req, res) => res.json({ categories: CATEGORIES, locations: LOCATIONS }));

itemsRouter.get('/', optionalAuth, (req, res) => {
  const { q, type, category, location, status, from, to, page = 1, sort = 'new' } = req.query;
  const where = [`i.status != 'removed'`]; const args = [];
  if (type === 'lost' || type === 'found') { where.push('i.type=?'); args.push(type); }
  if (category) { where.push('i.category=?'); args.push(category); }
  if (location) { where.push('i.location=?'); args.push(location); }
  if (status) { where.push('i.status=?'); args.push(status); }
  if (from) { where.push('i.event_date>=?'); args.push(from); }
  if (to) { where.push('i.event_date<=?'); args.push(to); }
  if (q?.trim()) {
    for (const w of q.trim().split(/\s+/).slice(0, 6)) {
      where.push(`(i.title LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\' OR i.category LIKE ? ESCAPE '\\')`);
      const like = `%${w.replace(/[\\%_]/g, '\\$&')}%`; args.push(like, like, like);
    }
  }
  const w = where.join(' AND ');
  const limit = 12, offset = (Math.max(1, +page || 1) - 1) * limit;
  const order = sort === 'old' ? 'i.created_at ASC' : 'i.urgent DESC, i.created_at DESC';
  const total = db.prepare(`SELECT COUNT(*) c FROM items i WHERE ${w}`).get(...args).c;
  const rows = db.prepare(`${BASE} WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, limit, offset);
  res.json({ items: rows.map((r) => serialize(r, req.user)), total, page: +page || 1, pages: Math.ceil(total / limit) });
});

itemsRouter.get('/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`${BASE} WHERE i.user_id=? AND i.status!='removed' ORDER BY i.created_at DESC`).all(req.user.id);
  const claimCount = db.prepare(`SELECT COUNT(*) c FROM claims WHERE item_id=? AND status='pending'`);
  res.json({ items: rows.map((r) => ({ ...serialize(r, req.user), pending_claims: claimCount.get(r.id).c })) });
});

itemsRouter.get('/favorites', requireAuth, (req, res) => {
  const rows = db.prepare(`${BASE} JOIN favorites f ON f.item_id=i.id WHERE f.user_id=? AND i.status!='removed' ORDER BY i.created_at DESC`).all(req.user.id);
  res.json({ items: rows.map((r) => serialize(r, req.user)) });
});

itemsRouter.get('/:id', optionalAuth, (req, res) => {
  const row = db.prepare(`${BASE} WHERE i.id=?`).get(req.params.id);
  if (!row || (row.status === 'removed' && req.user?.role !== 'admin')) return res.status(404).json({ error: 'Item not found' });
  const out = serialize(row, req.user);
  if (req.user) {
    out.favorited = !!db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND item_id=?').get(req.user.id, row.id);
    const c = db.prepare('SELECT id,status FROM claims WHERE item_id=? AND claimant_id=?').get(row.id, req.user.id);
    out.my_claim = c || null;
  }
  res.json({ item: out });
});

// Possible matches: opposite-type open items ranked by similarity score.
itemsRouter.get('/:id/matches', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const other = item.type === 'lost' ? 'found' : 'lost';
  const cands = db.prepare(`${BASE} WHERE i.type=? AND i.status='open' AND i.user_id!=?`).all(other, item.user_id);
  const matches = cands.map((c) => ({ ...scoreMatch(item, c), item: serialize(c, req.user) }))
    .filter((m) => m.score >= 40).sort((a, b) => b.score - a.score).slice(0, 5);
  res.json({ matches });
});

function validate(b) {
  const e = [];
  if (!['lost', 'found'].includes(b.type)) e.push('type must be lost or found');
  if (!b.title?.trim()) e.push('title is required');
  if (!CATEGORIES.includes(b.category)) e.push('invalid category');
  if (!b.description?.trim()) e.push('description is required');
  if (!LOCATIONS.includes(b.location)) e.push('invalid location');
  if (!b.event_date || isNaN(Date.parse(b.event_date))) e.push('a valid date is required');
  else if (new Date(b.event_date) > new Date(Date.now() + 864e5)) e.push('date cannot be in the future');
  return e;
}

const clean = (b) => ({
  type: b.type, title: b.title.trim().slice(0, 120), category: b.category,
  description: b.description.trim().slice(0, 2000), location: b.location,
  location_detail: b.location_detail?.trim().slice(0, 200) || null, event_date: b.event_date,
  hidden_details: b.hidden_details?.trim().slice(0, 500) || null,
  handed_to_security: b.type === 'found' && (b.handed_to_security === 'true' || b.handed_to_security === true) ? 1 : 0,
  contact_pref: 'in_app',
  urgent: URGENT_CATEGORIES.includes(b.category) ? 1 : 0,
});

itemsRouter.post('/', requireAuth, upload.single('image'), (req, res) => {
  const errs = validate(req.body);
  if (errs.length) { if (req.file) fs.unlink(req.file.path, () => {}); return res.status(400).json({ error: errs.join('; ') }); }
  const d = clean(req.body);
  // Duplicate warning: same user, same type+category+location within 2 days with same title
  const dup = db.prepare(`SELECT id FROM items WHERE user_id=? AND type=? AND lower(title)=lower(?) AND status='open'`).get(req.user.id, d.type, d.title);
  if (dup && req.body.confirm_duplicate !== 'true') {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(409).json({ error: 'You already have an open report with this title.', duplicate_id: dup.id });
  }
  const info = db.prepare(`INSERT INTO items (user_id,type,title,category,description,location,location_detail,event_date,image,urgent,hidden_details,handed_to_security,contact_pref)
    VALUES (@user_id,@type,@title,@category,@description,@location,@location_detail,@event_date,@image,@urgent,@hidden_details,@handed_to_security,@contact_pref)`)
    .run({ ...d, user_id: req.user.id, image: req.file ? `/uploads/${req.file.filename}` : null });
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(info.lastInsertRowid);

  // Notify owners of strong matches on the other side
  const other = item.type === 'lost' ? 'found' : 'lost';
  for (const c of db.prepare(`SELECT * FROM items WHERE type=? AND status='open' AND user_id!=?`).all(other, req.user.id)) {
    const { score } = scoreMatch(item, c);
    if (score >= 60) notify(c.user_id, `Possible match for your ${c.type} report "${c.title}": new ${item.type} report "${item.title}"`, `/items/${item.id}`);
  }
  res.status(201).json({ item: serialize(item, req.user) });
});

function ownedOr404(req, res) {
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!item) { res.status(404).json({ error: 'Item not found' }); return null; }
  if (item.user_id !== req.user.id && req.user.role !== 'admin') { res.status(403).json({ error: 'Not your report' }); return null; }
  return item;
}

itemsRouter.put('/:id', requireAuth, upload.single('image'), (req, res) => {
  const item = ownedOr404(req, res); if (!item) return;
  const errs = validate({ ...item, ...req.body, type: item.type });
  if (errs.length) { if (req.file) fs.unlink(req.file.path, () => {}); return res.status(400).json({ error: errs.join('; ') }); }
  const d = clean({ ...item, ...req.body, type: item.type });
  db.prepare(`UPDATE items SET title=@title,category=@category,description=@description,location=@location,location_detail=@location_detail,event_date=@event_date,
    hidden_details=@hidden_details,handed_to_security=@handed_to_security,urgent=@urgent,image=COALESCE(@image,image) WHERE id=@id`)
    .run({ title: d.title, category: d.category, description: d.description, location: d.location, location_detail: d.location_detail, event_date: d.event_date,
      hidden_details: d.hidden_details, handed_to_security: d.handed_to_security, urgent: d.urgent, id: item.id, image: req.file ? `/uploads/${req.file.filename}` : null });
  res.json({ item: serialize(db.prepare(`${BASE} WHERE i.id=?`).get(item.id), req.user) });
});

itemsRouter.post('/:id/resolve', requireAuth, (req, res) => {
  const item = ownedOr404(req, res); if (!item) return;
  db.prepare(`UPDATE items SET status='resolved', resolved_at=datetime('now') WHERE id=?`).run(item.id);
  db.prepare(`UPDATE claims SET status='cancelled' WHERE item_id=? AND status IN ('pending')`).run(item.id);
  res.json({ ok: true });
});

itemsRouter.delete('/:id', requireAuth, (req, res) => {
  const item = ownedOr404(req, res); if (!item) return;
  db.prepare('DELETE FROM items WHERE id=?').run(item.id);
  res.json({ ok: true });
});

itemsRouter.post('/:id/favorite', requireAuth, (req, res) => {
  const has = db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND item_id=?').get(req.user.id, req.params.id);
  if (has) db.prepare('DELETE FROM favorites WHERE user_id=? AND item_id=?').run(req.user.id, req.params.id);
  else if (db.prepare('SELECT 1 FROM items WHERE id=?').get(req.params.id)) db.prepare('INSERT INTO favorites VALUES (?,?)').run(req.user.id, req.params.id);
  res.json({ favorited: !has });
});

itemsRouter.post('/:id/report', requireAuth, (req, res) => {
  const reason = req.body?.reason?.trim();
  if (!reason) return res.status(400).json({ error: 'Please give a reason' });
  if (!db.prepare('SELECT 1 FROM items WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Item not found' });
  db.prepare('INSERT OR REPLACE INTO abuse_reports (item_id,reporter_id,reason) VALUES (?,?,?)').run(req.params.id, req.user.id, reason.slice(0, 500));
  res.json({ ok: true });
});
