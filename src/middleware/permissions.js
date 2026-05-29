import { resolvePermissions } from '../services/permission-service.js';
import { getConfigDb } from '../db/config-db.js';

export function checkPermission(action) {
  return (req, res, next) => {
    const tableId = parseInt(req.params.tableId, 10);
    const perms = resolvePermissions(getConfigDb(), req.user.userId, tableId);
    if (!perms[`${action}Access`]) {
      return res.status(403).json({ status: 'error', message: 'Access denied', data: null });
    }
    req.tablePermissions = perms;
    next();
  };
}
