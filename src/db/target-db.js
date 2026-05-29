import { createAdapter } from './adapters/index.js';
import config from '../config.js';

const _adapters = new Map();

export function getTargetAdapter(configDb, connectionId = null) {
  const key = connectionId ?? 'default';
  if (_adapters.has(key)) return _adapters.get(key);

  let connStr;
  if (connectionId) {
    const row = configDb.prepare(
      `SELECT connection_string FROM connections WHERE connection_id = ?`
    ).get(connectionId);
    if (!row) throw new Error(`Connection ${connectionId} not found`);
    connStr = row.connection_string;
  } else {
    connStr = config.targetDb;
    if (!connStr) throw new Error('TARGET_DB is not configured');
  }

  const adapter = createAdapter(connStr);
  _adapters.set(key, adapter);
  return adapter;
}

export function clearAdapterCache() {
  _adapters.clear();
}
