import mysql from 'mysql2/promise';

function parseConnectionString(connectionString) {
  // mysql://user:pass@host:port/database
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: parseInt(url.port || '3306', 10),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
}

function parseFieldType(rawType) {
  // rawType examples: "varchar(255)", "int(11)", "enum('a','b')", "tinyint(1)"
  const lower = rawType.toLowerCase();
  const parenIdx = lower.indexOf('(');
  if (parenIdx === -1) {
    return { type: lower, length: null, values: [] };
  }
  const type = lower.slice(0, parenIdx);
  const inner = rawType.slice(parenIdx + 1, rawType.lastIndexOf(')'));
  if (type === 'enum' || type === 'set') {
    const values = inner.split(',').map(v => v.trim().replace(/^'|'$/g, ''));
    return { type, length: null, values };
  }
  return { type, length: parseInt(inner, 10) || null, values: [] };
}

export class MysqlAdapter {
  constructor(connectionString) {
    this._connStr = connectionString;
    this._pool = null;
  }

  _getPool() {
    if (!this._pool) {
      this._pool = mysql.createPool({
        ...parseConnectionString(this._connStr),
        waitForConnections: true,
        connectionLimit: 10,
      });
    }
    return this._pool;
  }

  async select(sql, params = []) {
    const [rows] = await this._getPool().execute(sql, params);
    return rows;
  }

  async execute(sql, params = []) {
    const [result] = await this._getPool().execute(sql, params);
    return result.affectedRows ?? 0;
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
    const [result] = await this._getPool().execute(sql, Object.values(data));
    return result.insertId;
  }

  async describeTable(tableName) {
    const rows = await this.select(`SHOW FIELDS FROM \`${tableName}\``);
    return rows.map(row => {
      const { type, length, values } = parseFieldType(row.Type);
      return {
        name: row.Field,
        type,
        length,
        nullable: row.Null === 'YES',
        defaultValue: row.Default ?? null,
        values,
        autoIncrement: (row.Extra || '').includes('auto_increment'),
      };
    });
  }

  async close() {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }
}
