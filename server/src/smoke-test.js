// End-to-end API test using a throwaway database. Run: npm test
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'laf-'));
process.env.DB_FILE = path.join(tmp, 't.sqlite');
process.env.UPLOAD_DIR = path.join(tmp, 'up');
process.env.NODE_ENV = 'test';

const { createApp } = await import('./index.js');
const { db } = await import('./db.js');
const bcrypt = (await import('bcryptjs')).default;
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

async function call(method, url, body, token, form) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const r = await fetch(base + url, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
let n = 0; const ok = (name) => console.log(`  ✓ ${name}`, ++n && '');

const reg = (name, email) => call('POST', '/auth/register', { name, email, password: 'password123' });

// Auth
assert.equal((await reg('X', 'x@gmail.com')).status, 400); ok('rejects non-BRACU email');
const a = (await reg('Alice', 'alice@g.bracu.ac.bd')).data;
const b = (await reg('Bob', 'bob@g.bracu.ac.bd')).data;
const c = (await reg('Carol', 'carol@g.bracu.ac.bd')).data;
assert.equal((await reg('Alice', 'alice@g.bracu.ac.bd')).status, 409); ok('register + duplicate email');
assert.equal((await call('POST', '/auth/login', { email: 'alice@g.bracu.ac.bd', password: 'nope' })).status, 401); ok('bad login rejected');
assert.equal((await call('GET', '/auth/me', null, a.token)).data.user.email, 'alice@g.bracu.ac.bd'); ok('/me');

// Items
const today = new Date().toISOString().slice(0, 10);
const fd = (o) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.append(k, v)); return f; };
let r = await call('POST', '/items', null, a.token, fd({ type: 'lost', title: 'Black wallet', category: 'Wallet', description: 'black leather wallet with id card', location: 'Cafeteria', event_date: today }));
assert.equal(r.status, 201); const lostId = r.data.item.id; ok('create lost item');
r = await call('POST', '/items', null, b.token, fd({ type: 'found', title: 'Wallet found', category: 'Wallet', description: 'black leather wallet id card inside', location: 'Cafeteria', event_date: today, hidden_details: 'torn left stitching' }));
assert.equal(r.status, 201); const foundId = r.data.item.id; ok('create found item');
assert.equal((await call('POST', '/items', null, b.token, fd({ type: 'found', title: 'x', category: 'Nope', description: 'd', location: 'Cafeteria', event_date: today }))).status, 400); ok('validation');
const bad = new FormData(); Object.entries({ type: 'lost', title: 'T', category: 'Wallet', description: 'd', location: 'Library', event_date: today }).forEach(([k, v]) => bad.append(k, v));
bad.append('image', new Blob(['<?php ?>'], { type: 'text/html' }), 'x.php');
assert.equal((await call('POST', '/items', null, b.token, bad)).status, 400); ok('non-image upload rejected');

r = await call('GET', '/items?q=wallet&type=found');
assert.equal(r.data.total, 1); ok('search + filter');
assert.equal(r.data.items[0].hidden_details, undefined); assert.equal(r.data.items[0].has_hidden_details, true); ok('hidden details not public');
assert.equal((await call('GET', `/items/${foundId}`, null, b.token)).data.item.hidden_details, 'torn left stitching'); ok('owner sees hidden details');
assert.equal((await call('GET', `/items?q=${encodeURIComponent("%")}`)).data.total, 0); ok('LIKE wildcard escaped');

r = await call('GET', `/items/${lostId}/matches`, null, a.token);
assert.equal(r.data.matches[0].item.id, foundId); ok('smart matching finds the found wallet');
assert.ok((await call('GET', '/notifications', null, a.token)).data.unread >= 1); ok('match notification sent to owner');

r = await call('PUT', `/items/${lostId}`, null, a.token, fd({ title: 'Black wallet (edited)', category: 'Wallet', description: 'black leather wallet with id card', location: 'Library', event_date: today }));
assert.equal(r.status, 200); assert.equal(r.data.item.title, 'Black wallet (edited)'); ok('owner can edit item');

// Permissions
assert.equal((await call('PUT', `/items/${lostId}`, { title: 'hax' }, b.token)).status, 403); ok('cannot edit others\' items');

// Claims
assert.equal((await call('POST', '/claims', { item_id: foundId, message: 'mine' }, a.token)).status, 400); ok('verification answer required');
assert.equal((await call('POST', '/claims', { item_id: foundId, message: 'mine', verification_answer: 'x' }, b.token)).status, 400); ok('cannot claim own item');
const cl1 = (await call('POST', '/claims', { item_id: foundId, message: 'This is my wallet', verification_answer: 'left side stitching is torn' }, a.token)).data.id;
const cl2 = (await call('POST', '/claims', { item_id: foundId, message: 'Mine!', verification_answer: 'guess' }, c.token)).data.id;
assert.ok(cl1 && cl2); ok('two claims submitted');
assert.equal((await call('POST', '/claims', { item_id: foundId, message: 'again', verification_answer: 'x' }, a.token)).status, 409); ok('duplicate claim blocked');
r = await call('GET', `/claims/${cl1}`, null, b.token);
assert.equal(r.data.item.hidden_details, 'torn left stitching'); ok('finder sees hidden details + answer side by side');
assert.equal((await call('GET', `/claims/${cl1}`, null, c.token)).status, 403); ok('third party cannot read claim');
assert.equal((await call('GET', `/claims/${cl1}`, null, a.token)).data.item.hidden_details, undefined); ok('claimant never sees hidden details');
assert.equal((await call('POST', `/claims/${cl1}/messages`, { body: 'Where can we meet?' }, b.token)).status, 201); ok('chat message');
assert.equal((await call('POST', `/claims/${cl1}/accept`, null, a.token)).status, 403); ok('claimant cannot accept');
assert.equal((await call('POST', `/claims/${cl1}/accept`, null, b.token)).status, 200); ok('owner accepts claim');
assert.equal((await call('GET', `/claims/${cl2}`, null, c.token)).data.claim.status, 'rejected'); ok('other claims auto-rejected');
assert.equal((await call('GET', `/items/${foundId}`)).data.item.status, 'claimed'); ok('item marked claimed');
assert.equal((await call('POST', `/claims/${cl1}/confirm`, null, a.token)).status, 200); ok('handover confirmed');
assert.equal((await call('GET', `/items/${foundId}`)).data.item.status, 'resolved'); ok('item resolved');

// Admin
db.prepare(`INSERT INTO users (name,email,password_hash,role) VALUES ('Admin','admin@bracu.ac.bd',?, 'admin')`).run(bcrypt.hashSync('adminpass1', 4));
const adm = (await call('POST', '/auth/login', { email: 'admin@bracu.ac.bd', password: 'adminpass1' })).data;
assert.equal((await call('GET', '/admin/stats', null, a.token)).status, 403); ok('students blocked from admin');
r = await call('GET', '/admin/stats', null, adm.token);
assert.equal(r.data.resolved, 1); assert.equal(r.data.lost, 1); ok('admin stats');
await call('POST', `/items/${lostId}/report`, { reason: 'spam' }, c.token);
assert.equal((await call('GET', '/admin/reports', null, adm.token)).data.reports.length, 1); ok('abuse report flagged');
await call('POST', `/admin/items/${lostId}/remove`, null, adm.token);
assert.equal((await call('GET', `/items/${lostId}`)).status, 404); ok('admin removal hides item');
await call('POST', `/admin/users/${c.user.id}/ban`, { banned: true }, adm.token);
assert.equal((await call('POST', '/auth/login', { email: 'carol@g.bracu.ac.bd', password: 'password123' })).status, 403); ok('banned user blocked');

console.log(`\nAll ${n} checks passed.`);
server.close(); fs.rmSync(tmp, { recursive: true, force: true });
