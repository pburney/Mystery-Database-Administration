import { getTargetAdapter } from '../db/target-db.js';
import { getTable } from './table-service.js';

export function getForeignKeysForTable(db, tableId) {
  return db.prepare(
    `SELECT fk.*, ft.table_real_name AS foreign_real_name, ft.table_primary_key AS foreign_pk
     FROM foreign_keys fk
     JOIN tables ft ON ft.table_id = fk.foreign_table_id
     WHERE fk.local_table_id = ?`
  ).all(tableId);
}

export async function getFKOptions(configDb, tableId, localField) {
  const fk = configDb.prepare(
    `SELECT fk.*, ft.table_real_name AS foreign_real_name
     FROM foreign_keys fk
     JOIN tables ft ON ft.table_id = fk.foreign_table_id
     WHERE fk.local_table_id = ? AND fk.local_table_field = ?`
  ).get(tableId, localField);

  if (!fk) return null;

  const foreignTable = getTable(configDb, fk.foreign_table_id);
  const adapter = getTargetAdapter(configDb, foreignTable?.table_connection_id ?? null);

  const labelFields = fk.foreign_table_label_field.split(',').map(f => f.trim());
  const allFields = [...new Set([fk.foreign_table_value_field, ...labelFields])];

  const sql = `SELECT ${allFields.map(f => `"${f}"`).join(', ')} FROM "${fk.foreign_real_name}" ORDER BY "${labelFields[0]}"`;
  const rows = await adapter.select(sql);

  return rows.map(row => ({
    value: row[fk.foreign_table_value_field],
    label: labelFields.map(f => row[f]).filter(v => v != null).join(' '),
  }));
}
