import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { getConfigDb } from '../db/config-db.js';

const router = Router();

router.get('/', requireLogin, (req, res) => {
  const db = getConfigDb();

  let tables;
  if (req.user.isAdmin) {
    tables = db.prepare(
      `SELECT t.table_id, t.table_display_name, t.table_default_action
       FROM tables t
       WHERE t.table_display_in_portal = 1
       ORDER BY t.table_display_name`
    ).all();
  } else {
    tables = db.prepare(
      `SELECT DISTINCT t.table_id, t.table_display_name, t.table_default_action
       FROM tables t
       JOIN groups_tables gt ON gt.table_id = t.table_id
       JOIN users_groups ug ON ug.group_id = gt.group_id
       WHERE ug.user_id = ? AND gt.select_access = 1 AND t.table_display_in_portal = 1
       ORDER BY t.table_display_name`
    ).all(req.user.userId);
  }

  const plugins = req.user.isAdmin
    ? db.prepare(`SELECT * FROM plugins WHERE is_active = 1`).all()
    : db.prepare(
        `SELECT * FROM plugins
         WHERE is_active = 1
           AND (group_restriction = 0
                OR group_restriction IN (SELECT group_id FROM users_groups WHERE user_id = ?))`
      ).all(req.user.userId);

  res.json({ status: 'ok', message: 'ok', data: { tables, plugins } });
});

export default router;
