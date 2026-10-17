import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRouter } from './routes/auth.js';
import { itemsRouter } from './routes/items.js';
import { claimsRouter } from './routes/claims.js';
import { adminRouter } from './routes/admin.js';
import { miscRouter } from './routes/misc.js';
import { UPLOAD_DIR } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 10000 : 50 });
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', miscRouter);

  // Serve built frontend if present (single-process production mode)
  const dist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be 5MB or smaller' });
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 4000;
  createApp().listen(port, () => console.log(`API running on http://localhost:${port}`));
}
