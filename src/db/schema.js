export function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_username       TEXT    NOT NULL UNIQUE,
      user_email          TEXT    NOT NULL UNIQUE,
      user_password       TEXT    NOT NULL,
      user_first_name     TEXT    NOT NULL DEFAULT '',
      user_last_name      TEXT    NOT NULL DEFAULT '',
      user_valid_ip       TEXT    NOT NULL DEFAULT '*',
      is_active           INTEGER NOT NULL DEFAULT 1,
      password_is_default INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      group_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT    NOT NULL UNIQUE,
      group_desc TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users_groups (
      ug_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id  INTEGER NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
      UNIQUE(user_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id   TEXT    PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      session_data TEXT    NOT NULL DEFAULT '{}',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at   TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connections (
      connection_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_key    TEXT    NOT NULL UNIQUE,
      connection_label  TEXT    NOT NULL,
      connection_string TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tables (
      table_id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      table_real_name           TEXT    NOT NULL,
      table_database            TEXT    NOT NULL DEFAULT '',
      table_display_name        TEXT    NOT NULL,
      table_display_comment     TEXT    NOT NULL DEFAULT '',
      table_display_data_word   TEXT    NOT NULL DEFAULT 'Record',
      table_primary_key         TEXT    NOT NULL DEFAULT 'id',
      table_default_query       TEXT    NOT NULL DEFAULT '',
      table_default_order_field TEXT    NOT NULL DEFAULT '',
      table_default_reverse_sort INTEGER NOT NULL DEFAULT 0,
      table_default_display_fields TEXT NOT NULL DEFAULT '',
      table_default_display_rows   INTEGER NOT NULL DEFAULT 25,
      table_default_action      TEXT    NOT NULL DEFAULT 'list',
      table_is_many_to_many     INTEGER NOT NULL DEFAULT 0,
      table_display_in_portal   INTEGER NOT NULL DEFAULT 1,
      table_owner_key           TEXT    NOT NULL DEFAULT '',
      table_owner_type          TEXT    NOT NULL DEFAULT '',
      table_connection_id       INTEGER REFERENCES connections(connection_id),
      created_at                TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups_tables (
      gt_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id      INTEGER NOT NULL REFERENCES groups(group_id)  ON DELETE CASCADE,
      table_id      INTEGER NOT NULL REFERENCES tables(table_id)  ON DELETE CASCADE,
      select_access INTEGER NOT NULL DEFAULT 0,
      insert_access INTEGER NOT NULL DEFAULT 0,
      update_access INTEGER NOT NULL DEFAULT 0,
      delete_access INTEGER NOT NULL DEFAULT 0,
      UNIQUE(group_id, table_id)
    );

    CREATE TABLE IF NOT EXISTS foreign_keys (
      fk_id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      local_table_id            INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
      local_table_field         TEXT    NOT NULL,
      foreign_table_id          INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
      foreign_table_value_field TEXT    NOT NULL,
      foreign_table_label_field TEXT    NOT NULL,
      list_display_type         TEXT    NOT NULL DEFAULT 'select'
    );

    CREATE TABLE IF NOT EXISTS triggers (
      trigger_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id          INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
      trigger_when      TEXT    NOT NULL,
      trigger_condition TEXT    NOT NULL,
      trigger_function  TEXT    NOT NULL,
      sort_order        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS table_views (
      view_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id         INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
      view_name        TEXT    NOT NULL,
      view_description TEXT    NOT NULL DEFAULT '',
      view_query       TEXT    NOT NULL,
      UNIQUE(table_id, view_name)
    );

    CREATE TABLE IF NOT EXISTS group_hidden_fields (
      ghf_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id   INTEGER NOT NULL REFERENCES tables(table_id)  ON DELETE CASCADE,
      group_id   INTEGER NOT NULL REFERENCES groups(group_id)  ON DELETE CASCADE,
      field_name TEXT    NOT NULL,
      UNIQUE(table_id, group_id, field_name)
    );

    CREATE TABLE IF NOT EXISTS group_view_only_fields (
      gvof_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id   INTEGER NOT NULL REFERENCES tables(table_id)  ON DELETE CASCADE,
      group_id   INTEGER NOT NULL REFERENCES groups(group_id)  ON DELETE CASCADE,
      field_name TEXT    NOT NULL,
      UNIQUE(table_id, group_id, field_name)
    );

    CREATE TABLE IF NOT EXISTS plugins (
      plugin_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      plugin_key        TEXT    NOT NULL UNIQUE,
      plugin_label      TEXT    NOT NULL,
      plugin_route      TEXT    NOT NULL,
      group_restriction INTEGER NOT NULL DEFAULT 0,
      is_active         INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS mystery_settings (
      setting_key   TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      log_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER,
      username     TEXT,
      table_id     INTEGER,
      table_name   TEXT,
      record_pk    TEXT,
      action       TEXT    NOT NULL,
      changed_data TEXT    NOT NULL DEFAULT '{}',
      ip_address   TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
