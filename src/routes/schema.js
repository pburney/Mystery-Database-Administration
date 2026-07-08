import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { getTable } from '../services/table-service.js';
import { getForeignKeysForTable } from '../services/foreign-key-service.js';
import { resolvePermissions } from '../services/permission-service.js';
import { getConfigDb } from '../db/config-db.js';
import { getTargetAdapter } from '../db/target-db.js';

const router = Router();

router.get('/:tableId', requireLogin, async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const db = getConfigDb();
    const table = getTable(db, tableId);
    if (!table) return res.status(404).json({ status: 'error', message: 'Table not found', data: null });

    const adapter = getTargetAdapter(db, table.table_connection_id);
    const fields = await adapter.describeTable(table.table_real_name);
    const foreignKeys = getForeignKeysForTable(db, tableId);
    const permissions = resolvePermissions(db, req.user.userId, tableId);

    res.json({ status: 'ok', message: 'ok', data: { table, fields, foreignKeys, permissions } });
  } catch (err) {
    next(err);
  }
});

export default router;
