import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { getConfigDb } from '../../db/config-db.js';

const router = Router();
router.use(requireAdmin);

router.post('/', (req, res) => {
  const { local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field } = req.body || {};
  if (!local_table_id || !local_table_field || !foreign_table_id || !foreign_table_value_field || !foreign_table_label_field) {
    return res.status(400).json({ status: 'error', message: 'local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, and foreign_table_label_field are required', data: null });
  }
  const result = getConfigDb().prepare(`
    INSERT INTO foreign_keys (local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field)
    VALUES (?, ?, ?, ?, ?)
  `).run(local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field);
  const fk = getConfigDb().prepare(`SELECT * FROM foreign_keys WHERE fk_id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ status: 'ok', message: 'FK created', data: fk });
});

router.delete('/:id', (req, res) => {
  const fk = getConfigDb().prepare(`SELECT * FROM foreign_keys WHERE fk_id = ?`).get(req.params.id);
  if (!fk) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
  getConfigDb().prepare(`DELETE FROM foreign_keys WHERE fk_id = ?`).run(req.params.id);
  res.json({ status: 'ok', message: 'FK deleted', data: null });
});

export default router;
