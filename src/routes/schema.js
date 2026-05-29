import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { getTable } from '../services/table-service.js';
import { getConfigDb } from '../db/config-db.js';
import { getTargetAdapter } from '../db/target-db.js';

const router = Router();

router.get('/:tableId', requireLogin, async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const table = getTable(getConfigDb(), tableId);
    if (!table) return res.status(404).json({ status: 'error', message: 'Table not found', data: null });

    const adapter = getTargetAdapter(getConfigDb(), table.table_connection_id);
    const fields = await adapter.describeTable(table.table_real_name);

    res.json({ status: 'ok', message: 'ok', data: { table, fields } });
  } catch (err) {
    next(err);
  }
});

export default router;
