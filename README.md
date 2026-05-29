# Mystery

A general-purpose database admin interface that auto-generates CRUD screens for any MySQL or SQLite database. Configure a table once, and Mystery generates the list, search, view, add, edit, and delete pages automatically — with group-based permissions controlling who can do what.

Mystery keeps its own configuration (users, groups, permissions, table definitions) in a separate SQLite file, so your target database stays clean.

## Features

- **Zero-code CRUD** — point Mystery at a table, it builds the interface
- **Group-based permissions** — per-table select/insert/update/delete flags per group
- **Foreign key dropdowns** — configure relationships, get select menus automatically
- **Hook/trigger system** — run custom code before/after any insert, update, or delete
- **Plugin architecture** — add Express routes + frontend pages without touching core code
- **Multiple target DBs** — MySQL and SQLite supported; switchable per table
- **Self-contained config** — Mystery's own data lives in `mystery.db`, not in your app's database

## Setup

```bash
git clone https://github.com/pburney/Mystery-Database-Administration.git
cd Mystery-Database-Administration
npm install
cp .env.example .env
# Edit .env — set TARGET_DB and SESSION_SECRET at minimum
node src/server.js
```

Open `http://localhost:3000` and log in as `admin` / `admin`.

**Change the admin password immediately** via the Users admin page.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TARGET_DB` | Yes | Connection string for the database to administer |
| `CONFIG_DB_PATH` | No | Path to Mystery's SQLite config file (default: `./mystery.db`) |
| `SESSION_SECRET` | Yes | Random string for signing session cookies |
| `PORT` | No | Port to listen on (default: `3000`) |

### Connection string formats

```
mysql://user:password@host:3306/database_name
sqlite:///absolute/path/to/file.db
sqlite://./relative/path/to/file.db
```

## First steps after install

1. **Sign in** as `admin` / `admin` and change the password
2. **Add a table** under Admin → Tables — enter the real table name and a display name
3. **Set permissions** under Admin → Groups → Administrators → Permissions (admins get full access automatically)
4. **Add non-admin users** and assign them to groups with appropriate permissions
5. Browse your table from the main menu

## Writing a plugin

See [src/plugins/README.md](src/plugins/README.md) for the full authoring guide.

A minimal plugin:

```js
// src/plugins/my-tool/index.js
import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';

const router = Router();
router.get('/status', requireLogin, (req, res) => {
  res.json({ status: 'ok', message: 'All good', data: null });
});
export default router;
```

Register it in the `plugins` table, and it appears in the main menu and is mounted at `/api/plugins/my-tool`.

## Writing a hook

```js
// src/plugins/my-tool/hooks/after-insert.js
export default async function (ctx) {
  const { tableId, pkValue, requestData, adapter, messages } = ctx;
  // Run extra queries, send notifications, update related tables…
  messages.push({ type: 'info', text: 'Related records updated' });
}
```

Register it via the `triggers` table or the admin UI (coming in a future release).

## Development

```bash
npm run dev      # Start with --watch (auto-restart on changes)
npm test         # Run all tests
npm run coverage # Coverage report
```

## Stack

- **Backend**: Node.js + Express
- **Config DB**: SQLite via better-sqlite3
- **Target DB adapters**: mysql2 (MySQL), better-sqlite3 (SQLite)
- **Frontend**: Vanilla ES modules + Tailwind CSS
- **Tests**: Vitest

## License

MIT
