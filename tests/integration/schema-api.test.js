import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import Database from 'better-sqlite3';
import { buildTestDb } from '../fixtures/db.js';
import { SqliteAdapter } from '../../src/db/adapters/sqlite-adapter.js';

// Mock target-db so this test doesn't need a real MySQL or file path
vi.mock('../../src/db/target-db.js', () => ({
  getTargetAdapter: vi.fn(),
}));

import { getTargetAdapter } from '../../src/db/target-db.js';

async function buildApp(db) {
  const { default: express } = await import('express');
  const { setTestDb } = await import('../../src/db/config-db.js');
  setTestDb(db);

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.cookies = {};
    const header = req.headers.cookie || '';
    for (const part of header.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k) req.cookies[k.trim()] = decodeURIComponent(v.join('='));
    }
    next();
  });

  const { default: apiRouter } = await import('../../src/routes/index.js');
  app.use('/api', apiRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ status: 'error', message: err.message, data: null });
  });
  return app;
}

async function httpRequest(server, method, path, body, cookieHeader = '') {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const options = {
      method: method.toUpperCase(),
      path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    };
    const req = http.request(server, options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, json: () => JSON.parse(data) });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

let app, db, tableId, server, serverAddress;

beforeAll(async () => {
  ({ db, tableId } = await buildTestDb());

  const targetDb = new Database(':memory:');
  targetDb.exec(`
    CREATE TABLE products (
      product_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      price      REAL NOT NULL DEFAULT 0
    )
  `);
  getTargetAdapter.mockReturnValue(new SqliteAdapter(targetDb));

  app = await buildApp(db);
  server = http.createServer(app);
  server.listen(0);
  serverAddress = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  const { clearTestDb } = await import('../../src/db/config-db.js');
  clearTestDb();
  server.close();
});

async function loginAs(username, password) {
  const res = await httpRequest(serverAddress, 'POST', '/api/auth/login', { username, password });
  return res.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
}

describe('GET /api/schema/:tableId permissions', () => {
  it('gives an admin full CRUD permissions', async () => {
    const cookie = await loginAs('admin', 'admin');
    const res = await httpRequest(serverAddress, 'GET', `/api/schema/${tableId}`, null, cookie);
    const body = res.json();
    expect(res.status).toBe(200);
    expect(body.data.permissions).toEqual({
      selectAccess: true, insertAccess: true, updateAccess: true, deleteAccess: true,
    });
  });

  it('gives a read-only reader select access but no insert/update/delete', async () => {
    const cookie = await loginAs('reader', 'pass');
    const res = await httpRequest(serverAddress, 'GET', `/api/schema/${tableId}`, null, cookie);
    const body = res.json();
    expect(res.status).toBe(200);
    expect(body.data.permissions).toEqual({
      selectAccess: true, insertAccess: false, updateAccess: false, deleteAccess: false,
    });
  });
});
