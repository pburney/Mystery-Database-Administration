import { Router } from 'express';
import { login, logout, getSession } from '../services/auth-service.js';
import { getConfigDb } from '../db/config-db.js';

const router = Router();

router.post('/login', (req, res) => {
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
  });

  res.json({ status: 'ok', message: 'Logged in', data: result.user });
});

router.post('/logout', (req, res) => {
  const sessionId = req.cookies?.mystery_session;
  if (sessionId) logout(getConfigDb(), sessionId);
  res.clearCookie('mystery_session');
  res.json({ status: 'ok', message: 'Logged out', data: null });
});

router.get('/me', (req, res) => {
  const sessionId = req.cookies?.mystery_session;
  const user = getSession(getConfigDb(), sessionId);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated', data: null });
  }
  res.json({ status: 'ok', message: 'ok', data: user });
});

export default router;
