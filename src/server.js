import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import config from './config.js';
import { initConfigDb } from './db/config-db.js';
import apiRouter from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function start() {
  await initConfigDb();

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookie parser (inline — avoids a dependency)
  app.use((req, _res, next) => {
    req.cookies = {};
    const header = req.headers.cookie || '';
    for (const part of header.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k) req.cookies[k.trim()] = decodeURIComponent(v.join('='));
    }
    next();
  });

  app.use('/api', apiRouter);
  app.use(express.static(resolve(__dirname, '..', 'public')));

  // SPA fallback — serve index.html for any non-API GET
  app.get('*', (_req, res) => {
    res.sendFile(resolve(__dirname, '..', 'public', 'index.html'));
  });

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message || 'Internal server error', data: null });
  });

  app.listen(config.port, () => {
    console.log(`Mystery running at http://localhost:${config.port}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
