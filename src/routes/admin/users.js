import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../../middleware/auth.js';
import { getConfigDb } from '../../db/config-db.js';

const router = Router();
router.use(requireAdmin);

router.get('/', (_req, res) => {
  const users = getConfigDb().prepare(
    `SELECT u.user_id, u.user_username, u.user_email, u.user_first_name, u.user_last_name, u.is_active, u.created_at,
            GROUP_CONCAT(ug.group_id) AS group_ids
     FROM users u
     LEFT JOIN users_groups ug ON ug.user_id = u.user_id
     GROUP BY u.user_id
     ORDER BY u.user_username`
  ).all();
  res.json({ status: 'ok', message: 'ok', data: users });
});

router.post('/', async (req, res) => {
  const { user_username, user_email, user_password, user_first_name = '', user_last_name = '', group_ids = [] } = req.body || {};
  if (!user_username || !user_email || !user_password) {
    return res.status(400).json({ status: 'error', message: 'username, email, and password are required', data: null });
  }
  const db = getConfigDb();
  const hash = await bcrypt.hash(user_password, 12);
  const result = db.prepare(
    `INSERT INTO users (user_username, user_email, user_password, user_first_name, user_last_name)
     VALUES (?, ?, ?, ?, ?)`
  ).run(user_username, user_email, hash, user_first_name, user_last_name);
  const userId = result.lastInsertRowid;
  for (const gid of group_ids) {
    db.prepare(`INSERT OR IGNORE INTO users_groups (user_id, group_id) VALUES (?, ?)`).run(userId, gid);
  }
  res.status(201).json({ status: 'ok', message: 'User created', data: { userId } });
});

router.put('/:id', async (req, res) => {
  const { user_email, user_first_name, user_last_name, user_password, is_active, group_ids } = req.body || {};
  const db = getConfigDb();
  const user = db.prepare(`SELECT * FROM users WHERE user_id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ status: 'error', message: 'Not found', data: null });

  const updates = { user_email, user_first_name, user_last_name, is_active };
  if (user_password) updates.user_password = await bcrypt.hash(user_password, 12);

  const setClauses = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`).join(', ');
  const vals = Object.entries(updates).filter(([, v]) => v !== undefined).map(([, v]) => v);

  if (setClauses) {
    db.prepare(`UPDATE users SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`).run(...vals, req.params.id);
  }

  if (group_ids !== undefined) {
    db.prepare(`DELETE FROM users_groups WHERE user_id = ?`).run(req.params.id);
    for (const gid of group_ids) {
      db.prepare(`INSERT OR IGNORE INTO users_groups (user_id, group_id) VALUES (?, ?)`).run(req.params.id, gid);
    }
  }

  res.json({ status: 'ok', message: 'User updated', data: null });
});

router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id, 10) === 1) {
    return res.status(403).json({ status: 'error', message: 'Cannot delete the primary admin user', data: null });
  }
  getConfigDb().prepare(`DELETE FROM users WHERE user_id = ?`).run(req.params.id);
  res.json({ status: 'ok', message: 'User deleted', data: null });
});

export default router;
