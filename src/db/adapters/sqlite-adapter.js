import Database from 'better-sqlite3';
import { resolve } from 'path';

function parseConnectionString(connectionString) {
  // sqlite:///absolute/path or sqlite://./relative/path
  return connectionString.replace(/^sqlite:\/\//, '');
}

const SQLITE_TO_GENERIC = {
  integer: 'int',
  real: 'float',
  numeric: 'decimal',
  text: 'text',
  blob: 'blob',
};

function normaliseType(sqliteType) {
  const lower = (sqliteType || 'text').toLowerCase();
  for (const [key, val] of Object.entries(SQLITE_TO_GENERIC)) {
    if (lower.includes(key)) return val;
  }
  return lower;
}

export class SqliteAdapter {
  constructor(connectionStringOrDb) {
    if (typeof connectionStringOrDb === 'string') {
      const path = parseConnectionString(connectionStringOrDb);
      this._db = path === ':memory:'
        ? new Database(':memory:')
        : new Database(resolve(path));
      this._db.pragma('journal_mode = WAL');
      this._db.pragma('foreign_keys = ON');
    } else {
      // Accept a pre-opened better-sqlite3 Database instance (used in tests)
      this._db = connectionStringOrDb;
    }
  }

  async select(sql, params = []) {
    return this._db.prepare(sql).all(params);
  }

  async execute(sql, params = []) {
    const result = this._db.prepare(sql).run(params);
    return result.changes;
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
    const result = this._db.prepare(sql).run(Object.values(data));
    return result.lastInsertRowid;
  }

  async describeTable(tableName) {
    const rows = this._db.prepare(`PRAGMA table_info("${tableName}")`).all();
    return rows.map(row => ({
      name: row.name,
      type: normaliseType(row.type),
      length: null,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value ?? null,
      values: [],
      autoIncrement: row.pk === 1,
    }));
  }

  async close() {
    this._db.close();
  }
}
