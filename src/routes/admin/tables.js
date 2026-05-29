import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { listTables, getTable, createTable, updateTable, deleteTable } from '../../services/table-service.js';
import { getConfigDb } from '../../db/config-db.js';

const router = Router();

router.use(requireAdmin);

router.get('/', (_req, res) => {
  const tables = listTables(getConfigDb());
  res.json({ status: 'ok', message: 'ok', data: tables });
});

router.get('/:id', (req, res) => {
  const table = getTable(getConfigDb(), parseInt(req.params.id, 10));
  if (!table) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
  res.json({ status: 'ok', message: 'ok', data: table });
});

router.post('/', (req, res) => {
  const { table_real_name, table_display_name } = req.body || {};
  if (!table_real_name || !table_display_name) {
    return res.status(400).json({ status: 'error', message: 'table_real_name and table_display_name are required', data: null });
  }
  const created = createTable(getConfigDb(), req.body);
  res.status(201).json({ status: 'ok', message: 'Table created', data: created });
});

router.put('/:id', (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  if (!getTable(getConfigDb(), tableId)) {
    return res.status(404).json({ status: 'error', message: 'Not found', data: null });
  }
  const updated = updateTable(getConfigDb(), tableId, req.body);
  res.json({ status: 'ok', message: 'Table updated', data: updated });
});

router.delete('/:id', (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  if (!getTable(getConfigDb(), tableId)) {
    return res.status(404).json({ status: 'error', message: 'Not found', data: null });
  }
  deleteTable(getConfigDb(), tableId);
  res.json({ status: 'ok', message: 'Table deleted', data: null });
});

export default router;
