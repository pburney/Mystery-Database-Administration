import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestDb } from '../fixtures/db.js';
import { resolvePermissions } from '../../src/services/permission-service.js';

let db, adminUserId, userId2, tableId;

beforeEach(async () => {
  ({ db, adminUserId, userId2, tableId } = await buildTestDb());
});

describe('resolvePermissions()', () => {
  it('gives admins full access regardless of groups_tables', () => {
    const perms = resolvePermissions(db, adminUserId, tableId);
    expect(perms).toEqual({
      selectAccess: true,
      insertAccess: true,
      updateAccess: true,
      deleteAccess: true,
    });
  });

  it('gives reader only select access', () => {
    const perms = resolvePermissions(db, userId2, tableId);
    expect(perms.selectAccess).toBe(true);
    expect(perms.insertAccess).toBe(false);
    expect(perms.updateAccess).toBe(false);
    expect(perms.deleteAccess).toBe(false);
  });

  it('denies all access to a user not in any group for that table', () => {
    const { lastInsertRowid: noGroupUser } = db.prepare(
      `INSERT INTO users (user_username, user_email, user_password) VALUES ('ghost', 'ghost@x.com', 'x')`
    ).run();
    const perms = resolvePermissions(db, noGroupUser, tableId);
    expect(perms.selectAccess).toBe(false);
    expect(perms.insertAccess).toBe(false);
  });
});
