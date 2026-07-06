const _registry = new Map();

/**
 * Register a hook programmatically (used by plugins and tests).
 * @param {string} tableId
 * @param {string} event  - 'before:insert' | 'after:insert' | 'before:update' | etc.
 * @param {Function} fn
 */
export function registerHook(tableId, event, fn) {
  const key = `${tableId}:${event}`;
  if (!_registry.has(key)) _registry.set(key, []);
  _registry.get(key).push(fn);
}

export function clearHooks() {
  _registry.clear();
}

/**
 * Run all hooks registered for tableId + event, in DB sort order.
 * Context is shared and mutable — hooks can mutate requestData and push messages.
 *
 * @param {Object} configDb
 * @param {number} tableId
 * @param {string} event       - e.g. 'before:insert'
 * @param {Object} ctx
 * @param {Object} ctx.requestData   - mutable copy of submitted field values
 * @param {*}      ctx.pkValue       - null on before:insert; set after insert
 * @param {Object} ctx.adapter       - target DB adapter
 * @param {Object[]} ctx.messages    - hook pushes { type, text } here
 */
export async function runHooks(configDb, tableId, event, ctx) {
  const [when, condition] = event.split(':');

  const rows = configDb.prepare(
    `SELECT trigger_function FROM triggers
     WHERE table_id = ? AND trigger_when = ? AND trigger_condition = ?
     ORDER BY sort_order ASC`
  ).all(tableId, when, condition);

  for (const row of rows) {
    try {
      const mod = await import(row.trigger_function);
      const fn = mod.default ?? mod.handler;
      if (typeof fn === 'function') await fn(ctx);
    } catch (err) {
      ctx.messages.push({ type: 'warning', text: `Hook ${row.trigger_function} failed: ${err.message}` });
    }
  }

  // Run programmatically registered hooks (table-specific and wildcard)
  for (const key of [`${tableId}:${event}`, `*:${event}`]) {
    for (const fn of (_registry.get(key) ?? [])) {
      try {
        await fn(ctx);
      } catch (err) {
        ctx.messages.push({ type: 'warning', text: `Hook failed: ${err.message}` });
      }
    }
  }
}
