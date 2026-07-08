import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';

const SESSION_HOURS = 4;

export function login(db, username, password) {
  const user = db.prepare(
    `SELECT * FROM users WHERE user_username = ? AND is_active = 1`
  ).get(username);

  if (!user) return null;

  const match = bcrypt.compareSync(password, user.user_password);
  if (!match) return null;

  const groups = db.prepare(
    `SELECT group_id FROM users_groups WHERE user_id = ?`
  ).all(user.user_id).map(r => r.group_id);

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(sessionId, user.user_id, expiresAt);

  return { sessionId, user: publicUser(user, groups) };
}

export function logout(db, sessionId) {
  db.prepare(`DELETE FROM sessions WHERE session_id = ?`).run(sessionId);
}

export function getSession(db, sessionId) {
  if (!sessionId) return null;

  const session = db.prepare(
    `SELECT s.*, u.*
     FROM sessions s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.session_id = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
  ).get(sessionId);

  if (!session) return null;

  const groups = db.prepare(
    `SELECT group_id FROM users_groups WHERE user_id = ?`
  ).all(session.user_id).map(r => r.group_id);

  return publicUser(session, groups);
}

export function getNoAuthUser(db, username) {
  const row = db.prepare(
    `SELECT * FROM users WHERE user_username = ? AND is_active = 1`
  ).get(username);

  if (!row) return null;

  const groups = db.prepare(
    `SELECT group_id FROM users_groups WHERE user_id = ?`
  ).all(row.user_id).map(r => r.group_id);

  return publicUser(row, groups);
}

export function resolveRequestUser(db, sessionId) {
  return config.noAuth ? getNoAuthUser(db, config.noAuthUser) : getSession(db, sessionId);
}

export function isAdmin(user) {
  return user?.groups?.includes(1) ?? false;
}

function publicUser(row, groups) {
  return {
    userId: row.user_id,
    username: row.user_username,
    email: row.user_email,
    firstName: row.user_first_name,
    lastName: row.user_last_name,
    groups,
    isAdmin: groups.includes(1),
    passwordIsDefault: row.password_is_default === 1,
  };
}
