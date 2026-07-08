import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildTestDb } from '../fixtures/db.js';
import { login, logout, getSession, isAdmin, getNoAuthUser, resolveRequestUser } from '../../src/services/auth-service.js';
import config from '../../src/config.js';

let db;

beforeEach(async () => {
  ({ db } = await buildTestDb());
});

describe('login()', () => {
  it('returns session + user for valid credentials', () => {
    const result = login(db, 'admin', 'admin');
    expect(result).not.toBeNull();
    expect(result.user.username).toBe('admin');
    expect(result.user.isAdmin).toBe(true);
    expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns null for wrong password', () => {
    expect(login(db, 'admin', 'wrong')).toBeNull();
  });

  it('returns null for unknown user', () => {
    expect(login(db, 'nobody', 'admin')).toBeNull();
  });

  it('stores session in db', () => {
    const result = login(db, 'admin', 'admin');
    const row = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(result.sessionId);
    expect(row).toBeTruthy();
    expect(row.user_id).toBe(1);
  });
});

describe('getSession()', () => {
  it('returns user for a valid session', () => {
    const { sessionId } = login(db, 'admin', 'admin');
    const user = getSession(db, sessionId);
    expect(user).not.toBeNull();
    expect(user.username).toBe('admin');
  });

  it('returns null for unknown session id', () => {
    expect(getSession(db, 'not-a-real-session')).toBeNull();
  });

  it('returns null when called with no session id', () => {
    expect(getSession(db, undefined)).toBeNull();
    expect(getSession(db, null)).toBeNull();
  });
});

describe('logout()', () => {
  it('removes session from db', () => {
    const { sessionId } = login(db, 'admin', 'admin');
    logout(db, sessionId);
    expect(getSession(db, sessionId)).toBeNull();
  });
});

describe('getNoAuthUser()', () => {
  it('returns the named user with no password check', () => {
    const user = getNoAuthUser(db, 'reader');
    expect(user).not.toBeNull();
    expect(user.username).toBe('reader');
    expect(user.isAdmin).toBe(false);
  });

  it('returns null for an unknown username', () => {
    expect(getNoAuthUser(db, 'nobody')).toBeNull();
  });

  it('returns null for an inactive user', () => {
    db.prepare(`UPDATE users SET is_active = 0 WHERE user_username = 'reader'`).run();
    expect(getNoAuthUser(db, 'reader')).toBeNull();
  });
});

describe('resolveRequestUser()', () => {
  afterEach(() => {
    config.noAuth = false;
    config.noAuthUser = '';
  });

  it('falls back to session lookup when NO_AUTH is off', () => {
    const { sessionId } = login(db, 'admin', 'admin');
    const user = resolveRequestUser(db, sessionId);
    expect(user.username).toBe('admin');
  });

  it('ignores the session id and resolves NO_AUTH_USER when NO_AUTH is on', () => {
    config.noAuth = true;
    config.noAuthUser = 'reader';
    expect(resolveRequestUser(db, 'not-a-real-session').username).toBe('reader');
  });

  it('fails closed when NO_AUTH_USER names no one', () => {
    config.noAuth = true;
    config.noAuthUser = 'nobody';
    expect(resolveRequestUser(db, 'irrelevant')).toBeNull();
  });
});

describe('isAdmin()', () => {
  it('returns true for admin user', () => {
    const { user } = login(db, 'admin', 'admin');
    expect(isAdmin(user)).toBe(true);
  });

  it('returns false for non-admin user', () => {
    const { user } = login(db, 'reader', 'pass');
    expect(isAdmin(user)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAdmin(null)).toBe(false);
  });
});
