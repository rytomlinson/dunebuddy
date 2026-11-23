import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initDb } from './db.js';
import { appRouter } from './trpcRouters/index.js';
import type { Context } from './trpc.js';

config({ path: resolve(import.meta.dirname, '../../.env') });

const app = express();

// Behind nginx (which doesn't gzip proxied responses); the rules text compresses ~4x.
app.set('trust proxy', 'loopback');
app.use(compression());
app.use(cors());
app.use(express.json());

// Hosted environments (Render etc.) provide a single DATABASE_URL; local dev uses the DB_* settings.
initDb(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        database: process.env.DB_NAME ?? 'dunebuddy',
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
      }
);

// Everything is served under /dune (devyeti.pro/dune). The health check stays at the root for
// the deploy script and uptime checks.
const BASE = '/dune';

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Old links (srv1307055.hstgr.cloud/g/…, /log/…, /rules) and the bare domain go to /dune.
app.use((req, res, next) => {
  if (req.path === BASE || req.path.startsWith(`${BASE}/`)) return next();
  res.redirect(301, `${BASE}${req.originalUrl === '/' ? '/' : req.originalUrl}`);
});

// tRPC middleware
app.use(
  `${BASE}/trpc`,
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }): Context => ({ req, res }),
  })
);

// In production, serve the built UI from the same server, with SPA fallback for /g/:id links.
const uiDist = resolve(import.meta.dirname, '../../ui/dist');
if (existsSync(uiDist)) {
  app.use(BASE, express.static(uiDist, { index: false, maxAge: '1h' }));
  app.get(`${BASE}*`, (_req, res) => {
    res.sendFile(resolve(uiDist, 'index.html'));
  });
}

// DATA_SERVICE_PORT for local dev (so it can't collide with the UI); PORT is what hosts provide.
const PORT = process.env.DATA_SERVICE_PORT ?? process.env.PORT ?? 3003;

app.listen(PORT, () => {
  console.log(`Data service running on port ${PORT}`);
});

export type { AppRouter } from './trpcRouters/index.js';
