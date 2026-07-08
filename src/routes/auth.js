import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, logout, resolveRequestUser } from '../services/auth-service.js';
import { getConfigDb } from '../db/config-db.js';
import config from '../config.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts. Please wait 15 minutes.', data: null },
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password required', data: null });
  }

  const result = login(getConfigDb(), username, password);
  if (!result) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials', data: null });
  }

  res.cookie('mystery_session', result.sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 4 * 3600 * 1000,
    secure: config.https,
  });

  res.json({ status: 'ok', message: 'Logged in', data: result.user });
});

router.post('/logout', (req, res) => {
  const sessionId = req.cookies?.mystery_session;
  if (sessionId) logout(getConfigDb(), sessionId);
  res.clearCookie('mystery_session');
  res.json({ status: 'ok', message: 'Logged out', data: null });
});

router.get('/branding', (req, res) => {
  const db = getConfigDb();
  const get = (key) => db.prepare('SELECT setting_value FROM mystery_settings WHERE setting_key = ?').get(key)?.setting_value ?? null;
  res.json({
    status: 'ok',
    message: 'ok',
    data: {
      logoUrl:  get('logo_url')  ?? `${config.basePath}/images/mystery-logo.png`,
      appName:  get('app_name')  ?? 'Mystery',
      subtitle: get('subtitle')  ?? 'Database Admin Interface',
    },
  });
});

router.get('/me', (req, res) => {
  const sessionId = req.cookies?.mystery_session;
  const user = resolveRequestUser(getConfigDb(), sessionId);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated', data: null });
  }
  res.json({ status: 'ok', message: 'ok', data: user });
});

export default router;
