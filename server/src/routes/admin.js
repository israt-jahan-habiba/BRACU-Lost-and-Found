import { Router } from 'express';
import { db, notify } from '../db.js';
import { requireAdmin } from '../auth.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/stats', (_req, res) => {
  const c = (sql) => db.prepare(sql).get().c;
  res.json({
    lost: c(`SELECT COUNT(*) c FROM items WHERE type='lost' AND status!='removed'`),
    found: c(`SELECT COUNT(*) c FROM items WHERE type='found' AND status!='removed'`),
    resolved: c(`SELECT COUNT(*) c FROM items WHERE status='resolved'`),
    unresolved: c(`SELECT COUNT(*) c FROM items WHERE status IN ('open','claimed')`),
    users: c('SELECT COUNT(*) c FROM users'),
    open_abuse: c('SELECT COUNT(*) c FROM abuse_reports WHERE resolved=0'),
    avg_resolution_days: db.prepare(`SELECT ROUND(AVG(julianday(resolved_at)-julianday(created_at)),1) d FROM items WHERE status='resolved' AND resolved_at IS NOT NULL`).get().d,
    top_categories: db.prepare(`SELECT category, COUNT(*) count FROM items WHERE status!='removed' GROUP BY category ORDER BY count DESC LIMIT 6`).all(),
    top_locations: db.prepare(`SELECT location, COUNT(*) count FROM items WHERE status!='removed' GROUP BY location ORDER BY count DESC LIMIT 6`).all(),
    recent_handovers: db.prepare(`SELECT i.id,i.title,i.type,i.resolved_at FROM items i WHERE status='resolved' ORDER BY resolved_at DESC LIMIT 5`).all(),
  });
});

adminRouter.get('/items', (_req, res) => {
  res.json({ items: db.prepare(`SELECT i.id,i.title,i.type,i.category,i.status,i.created_at,u.name poster_name,
    (SELECT COUNT(*) FROM abuse_reports a WHERE a.item_id=i.id AND a.resolved=0) AS flags
    FROM items i JOIN users u ON u.id=i.user_id ORDER BY flags DESC, i.created_at DESC LIMIT 200`).all() });
});

adminRouter.post('/items/:id/remove', (req, res) => {
  const it = db.prepare('SELECT user_id,title FROM items WHERE id=?').get(req.params.id);
  if (!it) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE items SET status='removed' WHERE id=?`).run(req.params.id);
  db.prepare('UPDATE abuse_reports SET resolved=1 WHERE item_id=?').run(req.params.id);
  notify(it.user_id, `Your report "${it.title}" was removed by a moderator`);
  res.json({ ok: true });
});
adminRouter.post('/items/:id/restore', (req, res) => {
  db.prepare(`UPDATE items SET status='open' WHERE id=? AND status='removed'`).run(req.params.id);
  res.json({ ok: true });
});

adminRouter.get('/reports', (_req, res) => {
  res.json({ reports: db.prepare(`SELECT a.id,a.reason,a.created_at,a.item_id,i.title,u.name reporter_name FROM abuse_reports a
    JOIN items i ON i.id=a.item_id JOIN users u ON u.id=a.reporter_id WHERE a.resolved=0 ORDER BY a.created_at DESC`).all() });
});
adminRouter.post('/reports/:id/dismiss', (req, res) => {
  db.prepare('UPDATE abuse_reports SET resolved=1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

adminRouter.get('/users', (_req, res) => {
  res.json({ users: db.prepare(`SELECT id,name,email,student_id,role,banned,created_at,
    (SELECT COUNT(*) FROM items WHERE user_id=users.id) AS items FROM users ORDER BY created_at DESC LIMIT 300`).all() });
});
adminRouter.post('/users/:id/ban', (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot ban yourself' });
  const banned = req.body?.banned ? 1 : 0;
  db.prepare(`UPDATE users SET banned=? WHERE id=? AND role!='admin'`).run(banned, req.params.id);
  res.json({ ok: true });
});
