import { getTestDb } from '../../src/db/config-db.js';
import { seed } from '../../src/db/seed.js';

export async function buildTestDb() {
  const db = getTestDb();
  await seed(db);

  // Second user (non-admin)
  const { hashSync } = await import('bcryptjs');
  const hash = hashSync('pass', 4);
  const { lastInsertRowid: userId2 } = db.prepare(
    `INSERT INTO users (user_username, user_email, user_password, user_first_name, user_last_name)
     VALUES ('reader', 'reader@localhost', ?, 'Read', 'Only')`
  ).run(hash);

  // Second group
  const { lastInsertRowid: groupId2 } = db.prepare(
    `INSERT INTO groups (group_name) VALUES ('Readers')`
  ).run();

  db.prepare(
    `INSERT INTO users_groups (user_id, group_id) VALUES (?, ?)`
  ).run(userId2, groupId2);

  // A table config
  const { lastInsertRowid: tableId } = db.prepare(
    `INSERT INTO tables (table_real_name, table_display_name, table_primary_key)
     VALUES ('products', 'Products', 'product_id')`
  ).run();

  // Reader group gets select only
  db.prepare(
    `INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
     VALUES (?, ?, 1, 0, 0, 0)`
  ).run(groupId2, tableId);

  return { db, adminUserId: 1, userId2, groupId2, tableId };
}
