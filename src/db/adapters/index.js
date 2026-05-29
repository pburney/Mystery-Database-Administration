import { MysqlAdapter } from './mysql-adapter.js';
import { SqliteAdapter } from './sqlite-adapter.js';

export function createAdapter(connectionString) {
  const proto = connectionString.split('://')[0].toLowerCase();
  if (proto === 'mysql') return new MysqlAdapter(connectionString);
  if (proto === 'sqlite') return new SqliteAdapter(connectionString);
  throw new Error(`Unknown adapter type: "${proto}". Use mysql:// or sqlite://`);
}
