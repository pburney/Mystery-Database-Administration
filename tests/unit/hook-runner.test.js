import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestDb } from '../fixtures/db.js';
import { registerHook, clearHooks, runHooks } from '../../src/hooks/hook-runner.js';

let configDb, tableId;

beforeEach(async () => {
  ({ db: configDb, tableId } = await buildTestDb());
  clearHooks();
});

describe('registerHook() + runHooks()', () => {
  it('calls a registered hook with the context', async () => {
    const calls = [];
    registerHook(tableId, 'before:insert', ctx => calls.push(ctx.event));

    const ctx = { requestData: {}, pkValue: null, adapter: null, messages: [], event: 'before:insert' };
    await runHooks(configDb, tableId, 'before:insert', ctx);
    expect(calls).toEqual(['before:insert']);
  });

  it('hook can mutate requestData', async () => {
    registerHook(tableId, 'before:insert', ctx => {
      ctx.requestData.extra = 'injected';
    });

    const ctx = { requestData: { name: 'test' }, pkValue: null, adapter: null, messages: [], event: 'before:insert' };
    await runHooks(configDb, tableId, 'before:insert', ctx);
    expect(ctx.requestData.extra).toBe('injected');
  });

  it('hook can push messages', async () => {
    registerHook(tableId, 'after:update', ctx => {
      ctx.messages.push({ type: 'info', text: 'Record updated successfully' });
    });

    const ctx = { requestData: {}, pkValue: 1, adapter: null, messages: [], event: 'after:update' };
    await runHooks(configDb, tableId, 'after:update', ctx);
    expect(ctx.messages).toHaveLength(1);
    expect(ctx.messages[0].type).toBe('info');
  });

  it('a failing hook adds a warning message and continues', async () => {
    registerHook(tableId, 'before:delete', () => { throw new Error('oops'); });
    registerHook(tableId, 'before:delete', ctx => { ctx.requestData.ran = true; });

    const ctx = { requestData: {}, pkValue: 1, adapter: null, messages: [], event: 'before:delete' };
    await runHooks(configDb, tableId, 'before:delete', ctx);
    expect(ctx.messages[0].type).toBe('warning');
    expect(ctx.requestData.ran).toBe(true);
  });

  it('runs no hooks when none are registered', async () => {
    const ctx = { requestData: {}, pkValue: null, adapter: null, messages: [], event: 'before:insert' };
    await runHooks(configDb, tableId, 'before:insert', ctx);
    expect(ctx.messages).toHaveLength(0);
  });
});
