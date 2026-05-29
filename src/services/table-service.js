export function listTables(db) {
  return db.prepare(`SELECT * FROM tables ORDER BY table_display_name`).all();
}

export function getTable(db, tableId) {
  return db.prepare(`SELECT * FROM tables WHERE table_id = ?`).get(tableId) ?? null;
}

export function createTable(db, data) {
  const stmt = db.prepare(`
    INSERT INTO tables
      (table_real_name, table_display_name, table_display_comment, table_display_data_word,
       table_primary_key, table_default_query, table_default_order_field, table_default_reverse_sort,
       table_default_display_fields, table_default_display_rows, table_default_action,
       table_is_many_to_many, table_display_in_portal,
       table_owner_key, table_owner_type, table_connection_id)
    VALUES
      (@table_real_name, @table_display_name, @table_display_comment, @table_display_data_word,
       @table_primary_key, @table_default_query, @table_default_order_field, @table_default_reverse_sort,
       @table_default_display_fields, @table_default_display_rows, @table_default_action,
       @table_is_many_to_many, @table_display_in_portal,
       @table_owner_key, @table_owner_type, @table_connection_id)
  `);
  const result = stmt.run(withDefaults(data));
  return getTable(db, result.lastInsertRowid);
}

export function updateTable(db, tableId, data) {
  const fields = Object.keys(withDefaults(data))
    .filter(k => k !== 'table_id')
    .map(k => `${k} = @${k}`)
    .join(', ');
  db.prepare(`UPDATE tables SET ${fields} WHERE table_id = @table_id`)
    .run({ ...withDefaults(data), table_id: tableId });
  return getTable(db, tableId);
}

export function deleteTable(db, tableId) {
  db.prepare(`DELETE FROM tables WHERE table_id = ?`).run(tableId);
}

function withDefaults(data) {
  return {
    table_real_name: '',
    table_display_name: '',
    table_display_comment: '',
    table_display_data_word: 'Record',
    table_primary_key: 'id',
    table_default_query: '',
    table_default_order_field: '',
    table_default_reverse_sort: 0,
    table_default_display_fields: '',
    table_default_display_rows: 25,
    table_default_action: 'list',
    table_is_many_to_many: 0,
    table_display_in_portal: 1,
    table_owner_key: '',
    table_owner_type: '',
    table_connection_id: null,
    ...data,
  };
}
