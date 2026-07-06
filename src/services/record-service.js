import { getTargetAdapter } from '../db/target-db.js';
import { getTable } from './table-service.js';
import { runHooks } from '../hooks/hook-runner.js';

function makeCtx(overrides) {
  return { requestData: {}, pkValue: null, adapter: null, messages: [], tableId: null, tableName: '', userId: null, username: null, ipAddress: null, ...overrides };
}

export async function listRecords(configDb, tableId, { page = 1, rows = 25, orderBy = '', dir = 'asc', q = '' } = {}) {
  const table = getTable(configDb, tableId);
  if (!table) throw Object.assign(new Error('Table not found'), { status: 404 });

  const adapter = getTargetAdapter(configDb, table.table_connection_id);
  const pk = table.table_primary_key;
  const offset = (page - 1) * rows;
  const safeDir = dir === 'desc' ? 'DESC' : 'ASC';
  const orderCol = orderBy || table.table_default_order_field || pk;
  const limitRows = Math.min(rows, 500);

  let sql = table.table_default_query || `SELECT * FROM \`${table.table_real_name}\``;
  const params = [];

  if (q) {
    const fields = await adapter.describeTable(table.table_real_name);
    const textFields = fields.filter(f => /char|text|varchar/.test(f.type));
    if (textFields.length) {
      const conditions = textFields.map(f => `\`${f.name}\` LIKE ?`).join(' OR ');
      sql = `SELECT * FROM (${sql}) _m WHERE ${conditions}`;
      textFields.forEach(() => params.push(`%${q}%`));
    }
  }

  const countRows = await adapter.select(`SELECT COUNT(*) AS cnt FROM (${sql}) _c`, params);
  const total = countRows[0]?.cnt ?? 0;
  const data = await adapter.select(`${sql} ORDER BY \`${orderCol}\` ${safeDir} LIMIT ? OFFSET ?`, [...params, limitRows, offset]);

  return { data, total, page, rows: limitRows };
}

export async function getRecord(configDb, tableId, pkValue) {
  const table = getTable(configDb, tableId);
  if (!table) throw Object.assign(new Error('Table not found'), { status: 404 });

  const adapter = getTargetAdapter(configDb, table.table_connection_id);
  const base = table.table_default_query || `SELECT * FROM \`${table.table_real_name}\``;
  const rows = await adapter.select(`SELECT * FROM (${base}) _t WHERE \`${table.table_primary_key}\` = ?`, [pkValue]);
  return rows[0] ?? null;
}

export async function insertRecord(configDb, tableId, data, meta = {}) {
  const table = getTable(configDb, tableId);
  if (!table) throw Object.assign(new Error('Table not found'), { status: 404 });

  const adapter = getTargetAdapter(configDb, table.table_connection_id);
  const ctx = makeCtx({ requestData: { ...data }, adapter, tableId, tableName: table.table_real_name, ...meta });

  await runHooks(configDb, tableId, 'before:insert', ctx);

  const newPk = await adapter.insert(table.table_real_name, ctx.requestData);
  ctx.pkValue = newPk;

  await runHooks(configDb, tableId, 'after:insert', ctx);

  return { pk: newPk, messages: ctx.messages };
}

export async function updateRecord(configDb, tableId, pkValue, data, meta = {}) {
  const table = getTable(configDb, tableId);
  if (!table) throw Object.assign(new Error('Table not found'), { status: 404 });

  const adapter = getTargetAdapter(configDb, table.table_connection_id);
  const ctx = makeCtx({ requestData: { ...data }, pkValue, adapter, tableId, tableName: table.table_real_name, ...meta });

  await runHooks(configDb, tableId, 'before:update', ctx);

  const keys = Object.keys(ctx.requestData);
  if (!keys.length) return { affected: 0, messages: ctx.messages };

  const setClauses = keys.map(k => `\`${k}\` = ?`).join(', ');
  const sql = `UPDATE \`${table.table_real_name}\` SET ${setClauses} WHERE \`${table.table_primary_key}\` = ?`;
  const affected = await adapter.execute(sql, [...Object.values(ctx.requestData), pkValue]);

  await runHooks(configDb, tableId, 'after:update', ctx);

  return { affected, messages: ctx.messages };
}

export async function deleteRecord(configDb, tableId, pkValue, meta = {}) {
  const table = getTable(configDb, tableId);
  if (!table) throw Object.assign(new Error('Table not found'), { status: 404 });

  const adapter = getTargetAdapter(configDb, table.table_connection_id);
  const ctx = makeCtx({ pkValue, adapter, tableId, tableName: table.table_real_name, ...meta });

  await runHooks(configDb, tableId, 'before:delete', ctx);

  const sql = `DELETE FROM \`${table.table_real_name}\` WHERE \`${table.table_primary_key}\` = ?`;
  const affected = await adapter.execute(sql, [pkValue]);

  await runHooks(configDb, tableId, 'after:delete', ctx);

  return { affected, messages: ctx.messages };
}
