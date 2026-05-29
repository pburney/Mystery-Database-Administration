# Mystery 6 Plugin Authoring Guide

A plugin is a directory under `src/plugins/` that extends Mystery with custom routes, hooks, and frontend pages.

## Minimal plugin structure

```
src/plugins/my-plugin/
├── index.js          # Required: exports an Express Router as default
└── hooks/
    └── after-insert.js   # Optional: hook modules
```

### `index.js`

```js
import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';

const router = Router();

router.get('/hello', requireLogin, (req, res) => {
  res.json({ status: 'ok', message: 'Hello from my-plugin!', data: null });
});

export default router;
```

The router is mounted at `/api/plugins/<plugin_key>` where `plugin_key` is the directory name.

### Hook modules

Hook modules export a default function that receives a `context` object:

```js
export default async function (ctx) {
  const { tableId, event, pkValue, requestData, adapter, configDb, messages } = ctx;

  // Mutate requestData to change what gets saved
  requestData.updated_at = new Date().toISOString();

  // Run additional queries via the adapter
  await adapter.execute('UPDATE related_table SET ... WHERE id = ?', [pkValue]);

  // Push messages back to the UI
  messages.push({ type: 'info', text: 'Relationships updated' });
}
```

### Registering a plugin

Insert a row into the `plugins` table in the Mystery config DB:

```sql
INSERT INTO plugins (plugin_key, plugin_label, plugin_route, is_active)
VALUES ('my-plugin', 'My Plugin', '/api/plugins/my-plugin', 1);
```

Or register a hook for a specific table via the `triggers` table:

```sql
INSERT INTO triggers (table_id, trigger_when, trigger_condition, trigger_function, sort_order)
VALUES (1, 'after', 'insert', './src/plugins/my-plugin/hooks/after-insert.js', 10);
```

### Frontend

Plugins can serve frontend JS from `src/plugins/<key>/public/<key>.js`.
The file will be accessible at `/plugins/<key>/<key>.js` and loaded when the user
navigates to `#/plugin/<key>`.
