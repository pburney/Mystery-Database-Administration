import bcrypt from 'bcryptjs';

export async function seed(db) {
  const existingAdmin = db.prepare('SELECT group_id FROM groups WHERE group_id = 1').get();
  if (existingAdmin) return;

  db.prepare(
    `INSERT OR IGNORE INTO groups (group_id, group_name, group_desc)
     VALUES (1, 'Administrators', 'Full system access')`
  ).run();

  const hash = await bcrypt.hash('admin', 12);
  const result = db.prepare(
    `INSERT OR IGNORE INTO users
       (user_username, user_email, user_password, user_first_name, user_last_name)
     VALUES ('admin', 'admin@localhost', ?, 'Admin', 'User')`
  ).run(hash);

  if (result.lastInsertRowid) {
    db.prepare(
      `INSERT OR IGNORE INTO users_groups (user_id, group_id) VALUES (?, 1)`
    ).run(result.lastInsertRowid);
  }
}
