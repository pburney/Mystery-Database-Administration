/**
 * Returns the effective CRUD permissions a user has on a table.
 * Admins (group_id=1) always get full access.
 * For non-admins, any group membership granting access counts (OR logic).
 */
export function resolvePermissions(db, userId, tableId) {
  // Admins have full access
  const isAdmin = db.prepare(
    `SELECT 1 FROM users_groups WHERE user_id = ? AND group_id = 1`
  ).get(userId);

  if (isAdmin) {
    return { selectAccess: true, insertAccess: true, updateAccess: true, deleteAccess: true };
  }

  const rows = db.prepare(
    `SELECT gt.*
     FROM groups_tables gt
     JOIN users_groups ug ON ug.group_id = gt.group_id
     WHERE ug.user_id = ? AND gt.table_id = ?`
  ).all(userId, tableId);

  return {
    selectAccess: rows.some(r => r.select_access === 1),
    insertAccess: rows.some(r => r.insert_access === 1),
    updateAccess: rows.some(r => r.update_access === 1),
    deleteAccess: rows.some(r => r.delete_access === 1),
  };
}
