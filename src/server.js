import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config.js';
import { initConfigDb, getConfigDb } from './db/config-db.js';
import apiRouter from './routes/index.js';
import { loadPlugins } from './plugins/loader.js';
import { registerHook } from './hooks/hook-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeAuditHook(action) {
  return async (ctx) => {
    try {
      getConfigDb().prepare(
        `INSERT INTO audit_log (user_id, username, table_id, table_name, record_pk, action, changed_data, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        ctx.userId ?? null,
        ctx.username ?? null,
        ctx.tableId ?? null,
        ctx.tableName ?? '',
        ctx.pkValue != null ? String(ctx.pkValue) : null,
        action,
        JSON.stringify(ctx.requestData ?? {}),
        ctx.ipAddress ?? null
      );
    } catch (err) {
      ctx.messages.push({ type: 'warning', text: `Audit log failed: ${err.message}` });
    }
  };
}

async function start() {
  await initConfigDb();

  // Register universal audit hooks (run after every CRUD operation)
  registerHook('*', 'after:insert', makeAuditHook('insert'));
  registerHook('*', 'after:update', makeAuditHook('update'));
  registerHook('*', 'after:delete', makeAuditHook('delete'));

  const app = express();

  if (config.https) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
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
  await loadPlugins(app, getConfigDb());
  app.use(express.static(resolve(__dirname, '..', 'public'), { index: false }));

  // SPA fallback — serve index.html for any non-API GET
  const indexPath = resolve(__dirname, '..', 'public', 'index.html');
  const indexHtml = readFileSync(indexPath, 'utf-8');
  const serveIndex = config.basePath
    ? (_req, res) => {
        const html = indexHtml.replace('<head>', `<head>\n  <base href="${config.basePath}/">`);
        res.type('html').send(html);
      }
    : (_req, res) => res.sendFile(indexPath);

  app.get('*', serveIndex);

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error(err.stack || err);
    res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal server error', data: null });
  });

  app.listen(config.port, () => {
    console.log(`Mystery running at http://localhost:${config.port}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
