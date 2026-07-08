import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { buildTestDb } from '../fixtures/db.js';
import { SqliteAdapter } from '../../src/db/adapters/sqlite-adapter.js';

// Mock target-db so tests don't need a real MySQL or file path
vi.mock('../../src/db/target-db.js', () => ({
  getTargetAdapter: vi.fn(),
}));

import { getTargetAdapter } from '../../src/db/target-db.js';
import { listRecords, getRecord, insertRecord, updateRecord, deleteRecord } from '../../src/services/record-service.js';

let configDb, tableId, targetDb, adapter;

beforeEach(async () => {
  ({ db: configDb, tableId } = await buildTestDb());

  targetDb = new Database(':memory:');
  targetDb.exec(`
    CREATE TABLE products (
      product_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      price      REAL NOT NULL DEFAULT 0
    )
  `);
  targetDb.prepare(`INSERT INTO products (name, price) VALUES ('Widget', 9.99)`).run();
  targetDb.prepare(`INSERT INTO products (name, price) VALUES ('Gadget', 19.99)`).run();

  adapter = new SqliteAdapter(targetDb);
  getTargetAdapter.mockReturnValue(adapter);
});

describe('listRecords()', () => {
  it('returns paginated records', async () => {
    const result = await listRecords(configDb, tableId, { page: 1, rows: 10 });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.data[0].name).toBe('Widget');
  });

  it('respects pagination', async () => {
    const result = await listRecords(configDb, tableId, { page: 1, rows: 1 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  it('throws 404 for unknown table', async () => {
    await expect(listRecords(configDb, 9999)).rejects.toMatchObject({ status: 404 });
  });

  it('finds records via a foreign-key-resolved label, not just local columns', async () => {
    targetDb.exec(`
      CREATE TABLE categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL
      )
    `);
    targetDb.prepare(`INSERT INTO categories (name) VALUES ('Electronics')`).run();
    targetDb.prepare(`INSERT INTO categories (name) VALUES ('Kitchenware')`).run();

    targetDb.exec(`ALTER TABLE products ADD COLUMN category_id INTEGER`);
    targetDb.prepare(`UPDATE products SET category_id = 1 WHERE name = 'Widget'`).run();
    targetDb.prepare(`UPDATE products SET category_id = 2 WHERE name = 'Gadget'`).run();

    const { lastInsertRowid: categoriesTableId } = configDb.prepare(
      `INSERT INTO tables (table_real_name, table_display_name, table_primary_key)
       VALUES ('categories', 'Categories', 'category_id')`
    ).run();

    configDb.prepare(
      `INSERT INTO foreign_keys (local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field)
       VALUES (?, 'category_id', ?, 'category_id', 'name')`
    ).run(tableId, categoriesTableId);

    // 'Electronics' isn't a column value on products at all — only reachable via the category FK.
    const result = await listRecords(configDb, tableId, { page: 1, rows: 10, q: 'Electronics' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Widget');
  });
});

describe('getRecord()', () => {
  it('returns a single record by pk', async () => {
    const record = await getRecord(configDb, tableId, 1);
    expect(record).not.toBeNull();
    expect(record.name).toBe('Widget');
  });

  it('returns null for missing pk', async () => {
    const record = await getRecord(configDb, tableId, 999);
    expect(record).toBeNull();
  });
});

describe('insertRecord()', () => {
  it('inserts and returns new pk', async () => {
    const result = await insertRecord(configDb, tableId, { name: 'Thingamajig', price: 5.00 });
    expect(result.pk).toBe(3);
    expect(result.messages).toEqual([]);
    const all = targetDb.prepare('SELECT * FROM products').all();
    expect(all).toHaveLength(3);
  });
});

describe('updateRecord()', () => {
  it('updates an existing record', async () => {
    const result = await updateRecord(configDb, tableId, 1, { price: 14.99 });
    expect(result.affected).toBe(1);
    expect(result.messages).toEqual([]);
    const row = targetDb.prepare('SELECT * FROM products WHERE product_id = 1').get();
    expect(row.price).toBe(14.99);
  });
});

describe('deleteRecord()', () => {
  it('deletes a record', async () => {
    const result = await deleteRecord(configDb, tableId, 1);
    expect(result.affected).toBe(1);
    const count = targetDb.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    expect(count).toBe(1);
  });
});
