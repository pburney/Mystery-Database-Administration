import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { getConfigDb } from '../../db/config-db.js';

const router = Router();
router.use(requireAdmin);

router.get('/', (_req, res) => {
  const groups = getConfigDb().prepare(`SELECT * FROM groups ORDER BY group_name`).all();
  res.json({ status: 'ok', message: 'ok', data: groups });
});

router.post('/', (req, res) => {
  const { group_name, group_desc = '' } = req.body || {};
  if (!group_name) return res.status(400).json({ status: 'error', message: 'group_name required', data: null });
  const result = getConfigDb().prepare(
    `INSERT INTO groups (group_name, group_desc) VALUES (?, ?)`
  ).run(group_name, group_desc);
  const group = getConfigDb().prepare(`SELECT * FROM groups WHERE group_id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ status: 'ok', message: 'Group created', data: group });
});

router.put('/:id', (req, res) => {
  const { group_name, group_desc } = req.body || {};
  const db = getConfigDb();
  const existing = db.prepare(`SELECT * FROM groups WHERE group_id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
  db.prepare(`UPDATE groups SET group_name = ?, group_desc = ? WHERE group_id = ?`).run(
    group_name ?? existing.group_name,
    group_desc ?? existing.group_desc,
    req.params.id
  );
  res.json({ status: 'ok', message: 'Group updated', data: db.prepare(`SELECT * FROM groups WHERE group_id = ?`).get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id, 10) === 1) {
    return res.status(403).json({ status: 'error', message: 'Cannot delete the Administrators group', data: null });
  }
  getConfigDb().prepare(`DELETE FROM groups WHERE group_id = ?`).run(req.params.id);
  res.json({ status: 'ok', message: 'Group deleted', data: null });
});

// Permission matrix for a group
router.get('/:id/permissions', (req, res) => {
  const rows = getConfigDb().prepare(
    `SELECT gt.*, t.table_display_name
     FROM groups_tables gt
     JOIN tables t ON t.table_id = gt.table_id
     WHERE gt.group_id = ?`
  ).all(req.params.id);
  res.json({ status: 'ok', message: 'ok', data: rows });
});

router.put('/:id/permissions', (req, res) => {
  const perms = req.body; // [{ tableId, selectAccess, insertAccess, updateAccess, deleteAccess }]
  if (!Array.isArray(perms)) return res.status(400).json({ status: 'error', message: 'Expected array of permissions', data: null });

  const db = getConfigDb();
  const upsert = db.prepare(`
    INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(group_id, table_id) DO UPDATE SET
      select_access = excluded.select_access,
      insert_access = excluded.insert_access,
      update_access = excluded.update_access,
      delete_access = excluded.delete_access
  `);
  const tx = db.transaction(() => {
    for (const p of perms) {
      upsert.run(req.params.id, p.tableId, p.selectAccess ? 1 : 0, p.insertAccess ? 1 : 0, p.updateAccess ? 1 : 0, p.deleteAccess ? 1 : 0);
    }
  });
  tx();
  res.json({ status: 'ok', message: 'Permissions updated', data: null });
});

export default router;
