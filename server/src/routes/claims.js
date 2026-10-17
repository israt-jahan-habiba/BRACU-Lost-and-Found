import { Router } from 'express';
import { db, notify } from '../db.js';
import { requireAuth } from '../auth.js';

export const claimsRouter = Router();
claimsRouter.use(requireAuth);

const getClaim = (id) => db.prepare(`
  SELECT c.*, i.user_id AS owner_id, i.title AS item_title, i.type AS item_type, i.status AS item_status,
         cu.name AS claimant_name, ou.name AS owner_name
  FROM claims c JOIN items i ON i.id=c.item_id
  JOIN users cu ON cu.id=c.claimant_id JOIN users ou ON ou.id=i.user_id WHERE c.id=?`).get(id);

function participant(req, res) {
  const c = getClaim(req.params.id);
  if (!c) { res.status(404).json({ error: 'Claim not found' }); return null; }
  if (![c.owner_id, c.claimant_id].includes(req.user.id)) { res.status(403).json({ error: 'Not your claim' }); return null; }
  return c;
}
const other = (c, uid) => (uid === c.owner_id ? c.claimant_id : c.owner_id);

claimsRouter.post('/', (req, res) => {
  const { item_id, message, verification_answer } = req.body || {};
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(item_id);
  if (!item || item.status !== 'open') return res.status(400).json({ error: 'This item is not open for claims' });
  if (item.user_id === req.user.id) return res.status(400).json({ error: 'You cannot claim your own report' });
  if (!message?.trim()) return res.status(400).json({ error: 'Please write a message' });
  if (item.type === 'found' && item.hidden_details && !verification_answer?.trim())
    return res.status(400).json({ error: 'Please describe identifying details that are not visible in the photo (ownership verification)' });
  if (db.prepare('SELECT 1 FROM claims WHERE item_id=? AND claimant_id=?').get(item.id, req.user.id))
    return res.status(409).json({ error: 'You have already sent a request for this item' });
  const info = db.prepare('INSERT INTO claims (item_id,claimant_id,message,verification_answer) VALUES (?,?,?,?)')
    .run(item.id, req.user.id, message.trim().slice(0, 1000), verification_answer?.trim().slice(0, 1000) || null);
  notify(item.user_id, `${req.user.name} sent a ${item.type === 'found' ? 'claim' : 'response'} on "${item.title}"`, `/claims/${info.lastInsertRowid}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

claimsRouter.get('/mine', (req, res) => {
  const base = `SELECT c.id,c.status,c.created_at,i.id AS item_id,i.title,i.type,i.image,
    (SELECT name FROM users WHERE id=c.claimant_id) AS claimant_name,
    (SELECT name FROM users WHERE id=i.user_id) AS owner_name FROM claims c JOIN items i ON i.id=c.item_id`;
  res.json({
    sent: db.prepare(`${base} WHERE c.claimant_id=? ORDER BY c.created_at DESC`).all(req.user.id),
    received: db.prepare(`${base} WHERE i.user_id=? ORDER BY c.created_at DESC`).all(req.user.id),
  });
});

claimsRouter.get('/:id', (req, res) => {
  const c = participant(req, res); if (!c) return;
  const isOwner = req.user.id === c.owner_id;
  const item = db.prepare('SELECT id,title,type,category,location,event_date,image,status,hidden_details FROM items WHERE id=?').get(c.item_id);
  if (!isOwner) delete item.hidden_details;
  const messages = db.prepare(`SELECT m.id,m.body,m.created_at,m.sender_id,u.name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE claim_id=? ORDER BY m.id`).all(c.id);
  res.json({
    claim: { id: c.id, status: c.status, message: c.message, created_at: c.created_at, claimant_id: c.claimant_id, claimant_name: c.claimant_name, owner_id: c.owner_id, owner_name: c.owner_name,
      verification_answer: isOwner || req.user.id === c.claimant_id ? c.verification_answer : undefined },
    item, messages, is_owner: isOwner,
  });
});

claimsRouter.post('/:id/messages', (req, res) => {
  const c = participant(req, res); if (!c) return;
  if (['rejected', 'cancelled'].includes(c.status)) return res.status(400).json({ error: 'This conversation is closed' });
  const body = req.body?.body?.trim();
  if (!body) return res.status(400).json({ error: 'Message is empty' });
  db.prepare('INSERT INTO messages (claim_id,sender_id,body) VALUES (?,?,?)').run(c.id, req.user.id, body.slice(0, 1000));
  notify(other(c, req.user.id), `New message from ${req.user.name} about "${c.item_title}"`, `/claims/${c.id}`);
  res.status(201).json({ ok: true });
});

claimsRouter.post('/:id/accept', (req, res) => {
  const c = participant(req, res); if (!c) return;
  if (req.user.id !== c.owner_id) return res.status(403).json({ error: 'Only the report owner can accept' });
  if (c.status !== 'pending' || c.item_status !== 'open') return res.status(400).json({ error: 'Claim cannot be accepted' });
  db.transaction(() => {
    db.prepare(`UPDATE claims SET status='accepted' WHERE id=?`).run(c.id);
    db.prepare(`UPDATE items SET status='claimed' WHERE id=?`).run(c.item_id);
    const others = db.prepare(`SELECT id,claimant_id FROM claims WHERE item_id=? AND id!=? AND status='pending'`).all(c.item_id, c.id);
    for (const o of others) { db.prepare(`UPDATE claims SET status='rejected' WHERE id=?`).run(o.id); notify(o.claimant_id, `Your request on "${c.item_title}" was not accepted`, `/claims/${o.id}`); }
  })();
  notify(c.claimant_id, `Your request on "${c.item_title}" was accepted! Arrange the handover in chat.`, `/claims/${c.id}`);
  res.json({ ok: true });
});

claimsRouter.post('/:id/reject', (req, res) => {
  const c = participant(req, res); if (!c) return;
  if (req.user.id !== c.owner_id) return res.status(403).json({ error: 'Only the report owner can reject' });
  if (c.status !== 'pending') return res.status(400).json({ error: 'Claim is not pending' });
  db.prepare(`UPDATE claims SET status='rejected' WHERE id=?`).run(c.id);
  notify(c.claimant_id, `Your request on "${c.item_title}" was not accepted`, `/claims/${c.id}`);
  res.json({ ok: true });
});

// Either side confirms the physical handover → item resolved, history preserved in claim row.
claimsRouter.post('/:id/confirm', (req, res) => {
  const c = participant(req, res); if (!c) return;
  if (c.status !== 'accepted') return res.status(400).json({ error: 'Only accepted claims can be completed' });
  db.transaction(() => {
    db.prepare(`UPDATE claims SET status='completed' WHERE id=?`).run(c.id);
    db.prepare(`UPDATE items SET status='resolved', resolved_at=datetime('now') WHERE id=?`).run(c.item_id);
  })();
  notify(other(c, req.user.id), `Handover of "${c.item_title}" confirmed. Thank you!`, `/claims/${c.id}`);
  res.json({ ok: true });
});

claimsRouter.post('/:id/cancel', (req, res) => {
  const c = participant(req, res); if (!c) return;
  if (req.user.id !== c.claimant_id) return res.status(403).json({ error: 'Only the requester can cancel' });
  if (!['pending', 'accepted'].includes(c.status)) return res.status(400).json({ error: 'Cannot cancel' });
  db.transaction(() => {
    db.prepare(`UPDATE claims SET status='cancelled' WHERE id=?`).run(c.id);
    if (c.status === 'accepted') db.prepare(`UPDATE items SET status='open' WHERE id=?`).run(c.item_id);
  })();
  notify(c.owner_id, `${req.user.name} cancelled their request on "${c.item_title}"`, `/claims/${c.id}`);
  res.json({ ok: true });
});
