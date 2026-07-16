# Mystery

A zero-code database admin interface. Point it at any MySQL or SQLite database, configure which tables to expose, and Mystery generates list, search, view, add, edit, and delete screens automatically — with group-based permissions controlling who can do what.

Mystery keeps its own configuration in a separate `mystery.db` file. Your target database is never modified.

## Features

- **Zero-code CRUD** — point Mystery at a table, it builds the interface
- **Group-based permissions** — per-table select/insert/update/delete flags per group
- **Field-level control** — hide fields or make them read-only per group
- **Foreign key dropdowns** — configure relationships, get select menus automatically
- **Automatic audit log** — every insert, update, and delete is recorded with user and IP
- **Hook/trigger system** — run custom code before/after any CRUD operation
- **Plugin architecture** — add Express routes + frontend pages without touching core code
- **Multiple target DBs** — MySQL and SQLite supported; switchable per table
- **Self-contained config** — Mystery's own data lives in `mystery.db`, separate from your app's database

---

## Quick Start

```bash
git clone https://github.com/pburney/mystery.git
cd mystery
npm install
cp .env.example .env
# Edit .env — set TARGET_DB and SESSION_SECRET at minimum
npm start
```

Open `http://localhost:3000` and log in as `admin` / `admin`. **Change the admin password immediately** — the UI will remind you.

---

## Try the Demo (Chinook Music Database)

The `examples/` folder includes the Chinook SQLite database (artists, albums, tracks, customers, invoices). One command sets up a fully-configured Mystery instance to explore it:

```bash
npm run demo       # Creates chinook-demo.sqlite, mystery-chinook.db, and .env.demo
cp .env.demo .env
npm start
```

Log in as `admin` / `admin` (full access) or `demo` / `demo` (read-only). Foreign key dropdowns, permissions, and all 11 tables are pre-configured.

---

## Using a Remote Database

Mystery doesn't have to live on a server. Run it locally and point it at any database your machine can reach — making it a personal, no-hosting-required admin tool.

**Direct connection:**
```env
TARGET_DB=mysql://user:password@db.example.com:3306/myapp
```

**Via SSH tunnel** (no firewall changes needed):
```bash
# Keep this running in one terminal:
ssh -L 3307:localhost:3306 user@remote-host

# .env:
TARGET_DB=mysql://user:password@127.0.0.1:3307/myapp
```

Clone, configure, start, browse. No server deployment required.

---

## AI-Assisted Setup

Mystery ships with an `AGENTS.md` file describing everything it can do — tables, groups, users, permissions, foreign keys, hooks, plugins, and more. Drop it into your AI tool's context and describe your database in plain English:

> "Read AGENTS.md. I have a PostgreSQL database with tables: users, posts, comments, tags, post_tags. Set up Mystery with a Moderators group that can edit and delete posts and comments, and a Readers group with read-only access to everything. Wire the foreign keys for post author and comment author."

The AI can produce the exact SQL to configure Mystery for your schema.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|---------|---------|-------------|
| `TARGET_DB` | Yes | — | Connection string for the database to administer |
| `SESSION_SECRET` | Yes | — | Random string for signing session cookies |
| `CONFIG_DB_PATH` | No | `./mystery.db` | Path to Mystery's config file |
| `PORT` | No | `3000` | Port to listen on |
| `HTTPS` | No | `false` | Set `true` behind a TLS proxy (enables secure cookie flag + trust proxy) |
| `NODE_ENV` | No | `development` | Set `production` for combined-format access logs |
| `NO_AUTH` | No | `false` | Set `true` to skip the login screen entirely (see below) |
| `NO_AUTH_USER` | No | — | Username to auto-authenticate as when `NO_AUTH=true` |

**`NO_AUTH` mode:** intended for disposable, localhost-only, single-user instances (e.g. a CLI
tool spinning up a throwaway web view of its own database) — not for anything multi-user or
exposed beyond localhost. When `NO_AUTH=true`, every request is treated as already logged in as
`NO_AUTH_USER`, skipping the password screen entirely. It only changes *how* a user is identified,
never *what* they're allowed to do — point `NO_AUTH_USER` at a read-only user and the instance
stays read-only; point it at an admin and it behaves like an admin session. If `NO_AUTH_USER`
doesn't name a real, active user, requests fail closed with 401 just like an invalid session
would.

**Connection string formats:**
```
mysql://user:password@host:3306/database_name
sqlite:///absolute/path/to/file.db
sqlite://./relative/path/to/file.db
```

Generate a strong session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## First Steps After Install

1. Sign in as `admin` / `admin` — change the password when prompted
2. **Admin → Tables → Create** — enter the real table name and a display name
3. **Admin → Groups** — create groups for your access roles
4. **Admin → Groups → Permissions** — set CRUD flags per table per group
5. **Admin → Users → Create** — add users and assign them to groups
6. Browse your tables from the main menu

---

## Writing a Hook

```js
// src/plugins/my-plugin/hooks/after-insert.js
export default async function(ctx) {
  const { tableId, tableName, pkValue, requestData, adapter, userId, username, messages } = ctx;
  // adapter.select(sql, params), adapter.execute(sql, params)
  messages.push({ type: 'info', text: 'Related records updated' });
}
```

Register via the `triggers` table. See [AGENTS.md](AGENTS.md) for the full contract.

---

## Writing a Plugin

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

Register in the `plugins` table. Plugin mounts at `/api/plugins/my-tool`. See [src/plugins/README.md](src/plugins/README.md) for the full guide, and [src/plugins/mixtape/](src/plugins/mixtape/) for a complete worked example (enabled by `npm run demo`).

---

## Deploying

Mystery runs behind a standard reverse proxy (Nginx, Caddy, etc.). See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Nginx and Caddy config examples
- systemd / PM2 process management
- Security checklist
- Upgrade notes

---

## Development

```bash
npm run dev      # Start with --watch (auto-restart on changes)
npm test         # Run all tests (32 tests, Vitest)
npm run coverage # Coverage report
```

---

## Stack

- **Backend**: Node.js + Express
- **Config DB**: SQLite via better-sqlite3
- **Target DB adapters**: mysql2 (MySQL), better-sqlite3 (SQLite)
- **Frontend**: Vanilla ES modules + Tailwind CSS
- **Tests**: Vitest
- **Security**: helmet, morgan, express-rate-limit

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Burney Web Services
