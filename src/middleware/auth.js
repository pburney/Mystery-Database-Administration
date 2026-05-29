import { getSession } from '../services/auth-service.js';
import { getConfigDb } from '../db/config-db.js';

export function requireLogin(req, res, next) {
  const sessionId = req.cookies?.mystery_session;
  const user = getSession(getConfigDb(), sessionId);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated', data: null });
  }
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  requireLogin(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Admin access required', data: null });
    }
    next();
  });
}
