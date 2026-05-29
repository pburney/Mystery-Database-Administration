import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { buildTestDb } from '../fixtures/db.js';
import { applySchema } from '../../src/db/schema.js';
import { seed } from '../../src/db/seed.js';

// Lightweight app factory — mirrors server.js but uses test db
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

let app, db;

beforeAll(async () => {
  ({ db } = await buildTestDb());
  app = await buildApp(db);
});

afterAll(async () => {
  const { clearTestDb } = await import('../../src/db/config-db.js');
  clearTestDb();
});

async function request(app, method, path, body, cookies = '') {
  const { default: supertest } = await import('supertest').catch(() => ({ default: null }));
  // Fallback: use node's http module directly since supertest may not be installed
  return new Promise((resolve) => {
    const req = app.request || app;
    // Simple in-process test using express's internal handler
    const mockReq = {
      method: method.toUpperCase(),
      url: path,
      headers: {
        'content-type': 'application/json',
        'cookie': cookies,
      },
      body: body || {},
      cookies: {},
    };
    // Parse cookies
    for (const part of cookies.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k) mockReq.cookies[k.trim()] = decodeURIComponent(v.join('='));
    }
    resolve(null); // placeholder
  });
}

// Use a real HTTP test approach via node's http module
import http from 'http';

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
        resolve({
          status: res.statusCode,
          headers: res.headers,
          json: () => JSON.parse(data),
        });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('POST /api/auth/login', () => {
  let server;
  let serverAddress;

  beforeAll(() => {
    server = http.createServer(app);
    server.listen(0);
    serverAddress = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => server.close());

  it('returns 200 and user data for valid credentials', async () => {
    const res = await httpRequest(serverAddress, 'POST', '/api/auth/login', { username: 'admin', password: 'admin' });
    const body = res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.data.username).toBe('admin');
    expect(body.data.isAdmin).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await httpRequest(serverAddress, 'POST', '/api/auth/login', { username: 'admin', password: 'wrong' });
    const body = res.json();
    expect(res.status).toBe(401);
    expect(body.status).toBe('error');
  });

  it('returns 401 for missing fields', async () => {
    const res = await httpRequest(serverAddress, 'POST', '/api/auth/login', {});
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me returns user after login', async () => {
    const loginRes = await httpRequest(serverAddress, 'POST', '/api/auth/login', { username: 'admin', password: 'admin' });
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
    const meRes = await httpRequest(serverAddress, 'GET', '/api/auth/me', null, cookie);
    const body = meRes.json();
    expect(meRes.status).toBe(200);
    expect(body.data.username).toBe('admin');
  });

  it('GET /api/auth/me returns 401 without session', async () => {
    const res = await httpRequest(serverAddress, 'GET', '/api/auth/me', null);
    expect(res.status).toBe(401);
  });
});
