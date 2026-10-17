// Creates an admin account and a few demo reports. Usage: npm run seed
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bracu.ac.bd';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';
const mk = (name, email, role = 'student', pw = 'password123') =>
  db.prepare('INSERT OR IGNORE INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run(name, email, bcrypt.hashSync(pw, 10), role);

mk('Admin', ADMIN_EMAIL, 'admin', ADMIN_PASSWORD);
mk('Nusrat Jahan', 'nusrat@g.bracu.ac.bd');
mk('Tanvir Ahmed', 'tanvir@g.bracu.ac.bd');

if (db.prepare('SELECT COUNT(*) c FROM items').get().c === 0) {
  const u = (e) => db.prepare('SELECT id FROM users WHERE email=?').get(e).id;
  const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const ins = db.prepare(`INSERT INTO items (user_id,type,title,category,description,location,event_date,urgent,hidden_details) VALUES (?,?,?,?,?,?,?,?,?)`);
  ins.run(u('nusrat@g.bracu.ac.bd'), 'lost', 'Black leather wallet', 'Wallet', 'Black wallet with a student ID card and some cash. Lost after lunch.', 'Cafeteria', day(1), 1, null);
  ins.run(u('tanvir@g.bracu.ac.bd'), 'found', 'Black wallet near cafeteria', 'Wallet', 'Found a black leather wallet on a table near the cafeteria counter.', 'Cafeteria', day(1), 1, 'Has a BRACU ID inside and a small tear on the left stitching');
  ins.run(u('tanvir@g.bracu.ac.bd'), 'lost', 'Blue water bottle', 'Water bottle', 'Blue steel bottle with a sticker of a cat on the side.', 'Library', day(3), 0, null);
  ins.run(u('nusrat@g.bracu.ac.bd'), 'found', 'Calculator Casio fx-991', 'Calculator', 'Casio scientific calculator left on a desk in the computer lab.', 'Computer Lab', day(2), 0, 'Initials scratched on the back');
}
console.log(`Seeded. Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  (change this!)`);
