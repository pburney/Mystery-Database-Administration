import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestDb } from '../fixtures/db.js';
import { login, logout, getSession, isAdmin } from '../../src/services/auth-service.js';

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
