import Database from 'better-sqlite3';
import { resolve } from 'path';
import { applySchema } from './schema.js';
import { seed } from './seed.js';
import config from '../config.js';

let _db = null;
let _testDb = null;

export function setTestDb(db) { _testDb = db; }
export function clearTestDb() { _testDb = null; }

export function getConfigDb() {
  if (_testDb) return _testDb;
  if (_db) return _db;
  const path = resolve(config.configDbPath);
  _db = new Database(path);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  applySchema(_db);
  return _db;
}

export async function initConfigDb() {
  const db = getConfigDb();
  await seed(db);
  return db;
}

export function getTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);
  return db;
}
