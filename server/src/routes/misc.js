import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const miscRouter = Router();

miscRouter.get('/stats', (_req, res) => {
  const c = (sql) => db.prepare(sql).get().c;
  res.json({
    lost: c(`SELECT COUNT(*) c FROM items WHERE type='lost' AND status='open'`),
    found: c(`SELECT COUNT(*) c FROM items WHERE type='found' AND status='open'`),
    returned: c(`SELECT COUNT(*) c FROM items WHERE status='resolved'`),
  });
});

miscRouter.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id);
  res.json({ notifications: rows, unread: rows.filter((r) => !r.read).length });
});
miscRouter.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});
