# Mystery — AI Agent Context

This file is for AI tools (Claude, Cursor, Copilot, etc.). Read it to understand what Mystery can do and how to configure it for a new database.

---

## What Mystery Is

Mystery is a zero-code database admin interface. Point it at an existing MySQL or SQLite database, configure which tables to expose, set up users and groups, and Mystery generates full CRUD screens automatically — list, search, view, add, edit, and delete. No code required.

Mystery keeps its own configuration (users, groups, permissions, table definitions) in a separate `mystery.db` SQLite file. Your target database is never modified.

---

## Capability Inventory

Here is everything you can configure:

### Tables
Map a real database table to a display name and behavior. Stored in the `tables` config table.

| Field | Purpose | Default |
|-------|---------|---------|
| `table_real_name` | Actual table name in the target database | required |
| `table_display_name` | Name shown in the UI | required |
| `table_primary_key` | Primary key field name | `id` |
| `table_default_query` | Custom SELECT query (replaces `SELECT *`) | empty |
| `table_default_order_field` | Default sort column | pk |
| `table_default_reverse_sort` | Sort descending by default (1/0) | 0 |
| `table_default_display_fields` | Comma-separated fields to show in list view | all fields |
| `table_default_display_rows` | Rows per page | 25 |
| `table_display_data_word` | Singular noun for a record ("Customer", "Post") | `Record` |
| `table_is_many_to_many` | Junction table flag — suppresses add/edit (1/0) | 0 |
| `table_display_in_portal` | Show in main menu (1/0) | 1 |
| `table_connection_id` | Use a non-default target DB connection | null |

### Groups
Named roles. `Administrators` (group_id=1) always has full access to everything. All other groups get only the permissions you grant.

```sql
INSERT INTO groups (group_name, group_desc) VALUES ('Editors', 'Can edit posts and comments');
```

### Users
Login accounts. Each user can belong to multiple groups. Permissions are combined with OR logic — if any group grants access, the user has it.

```sql
INSERT INTO users (user_username, user_email, user_password, user_first_name, user_last_name)
VALUES ('jsmith', 'jsmith@example.com', ?, 'Jane', 'Smith');
-- Always bcrypt-hash the password (cost 12) before inserting
```

To assign a user to a group:
```sql
INSERT INTO users_groups (user_id, group_id) VALUES (3, 2);
```

Optional: `user_valid_ip` — restrict logins to a specific IP address (default `*` = any).

### Permissions
Per-group, per-table. Four independent flags: select, insert, update, delete.

```sql
-- Read-only access
INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
VALUES (2, 5, 1, 0, 0, 0);

-- Full CRUD access
INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
VALUES (2, 5, 1, 1, 1, 1);

-- Update existing row
UPDATE groups_tables SET select_access=1, update_access=1
WHERE group_id=2 AND table_id=7;
```

Admins (group_id=1) always have full access regardless of `groups_tables` entries.

### Field Visibility (per group)
Hide a field entirely from a group, or make it read-only.

```sql
-- Hide the 'internal_notes' field from the Support group on the tickets table
INSERT INTO group_hidden_fields (table_id, group_id, field_name) VALUES (4, 3, 'internal_notes');

-- Make 'unit_price' read-only for the Catalog group on the products table
INSERT INTO group_view_only_fields (table_id, group_id, field_name) VALUES (2, 4, 'unit_price');
```

### Foreign Keys
Wire a field to another table so it renders as a dropdown instead of a raw ID.

```sql
INSERT INTO foreign_keys (local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field)
VALUES (3, 'category_id', 7, 'category_id', 'category_name');
```

For composite labels (e.g., first + last name), comma-separate the label fields:
```sql
-- Shows "Jane Smith" in dropdown
INSERT INTO foreign_keys (local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field)
VALUES (5, 'assigned_to', 8, 'user_id', 'first_name,last_name');
```

### Custom Queries
Override the base SELECT for a table. Supports filtering, JOINs, computed columns. Search and pagination still work on top.

```sql
-- Only show active records
UPDATE tables SET table_default_query = 'SELECT * FROM orders WHERE status != ''deleted'''
WHERE table_real_name = 'orders';

-- Join in a related column
UPDATE tables SET table_default_query =
  'SELECT p.*, c.category_name FROM products p JOIN categories c ON c.category_id = p.category_id'
WHERE table_real_name = 'products';
```

### Hooks (Triggers)
Run a JS module before or after any insert, update, or delete. Registered in the `triggers` table.

**Events:** `before:insert`, `after:insert`, `before:update`, `after:update`, `before:delete`, `after:delete`

```sql
INSERT INTO triggers (table_id, trigger_when, trigger_condition, trigger_function, sort_order)
VALUES (3, 'after', 'insert', './src/plugins/my-plugin/hooks/after-insert.js', 10);
```

**Hook module contract:**
```js
// ./src/plugins/my-plugin/hooks/after-insert.js
export default async function(ctx) {
  const { tableId, tableName, pkValue, requestData, adapter, userId, username, messages } = ctx;

  // adapter.select(sql, params)  — returns Promise<rows[]>
  // adapter.execute(sql, params) — returns Promise<affectedRows>
  // adapter.insert(table, data)  — returns Promise<insertId>

  // Mutate requestData on before:* hooks to change what gets saved
  // Push UI feedback:
  messages.push({ type: 'success', text: 'Related record updated' });
  // type: 'success' | 'info' | 'warning' | 'error'
}
```

### Plugins
Add custom Express routes + optional frontend pages without modifying core code.

**Directory structure:**
```
src/plugins/my-plugin/
  index.js          # Required — exports Express Router
  public/
    my-plugin.js    # Optional — loaded at #/plugin/my-plugin in frontend
  hooks/
    after-insert.js # Optional — hook modules
```

**Register in database:**
```sql
INSERT INTO plugins (plugin_key, plugin_label, plugin_route, group_restriction, is_active)
VALUES ('my-plugin', 'My Tool', '/api/plugins/my-plugin', 0, 1);
-- group_restriction: 0 = visible to all, or group_id to restrict
```

Plugin routes mount at `/api/plugins/my-plugin/*`.

### Branding
Override the app name, login subtitle, and logo per instance via the `mystery_settings` table.

```sql
INSERT INTO mystery_settings (setting_key, setting_value) VALUES ('app_name', 'My Admin');
INSERT INTO mystery_settings (setting_key, setting_value) VALUES ('subtitle', 'Powered by Mystery');
INSERT INTO mystery_settings (setting_key, setting_value) VALUES ('logo_url', 'https://example.com/logo.png');
```

Defaults: `app_name` = "Mystery", `subtitle` = "Database Admin Interface", `logo_url` = bundled dolphin logo at `/images/mystery-logo.png`.

The `/api/auth/branding` endpoint returns these values without requiring authentication — it is fetched by the login page before rendering.

### Multiple Database Connections
Mystery can manage tables from different databases in one instance.

```sql
INSERT INTO connections (connection_key, connection_label, connection_string)
VALUES ('warehouse', 'Data Warehouse', 'mysql://user:pass@db2.example.com:3306/warehouse');

-- Assign a table to use this connection
UPDATE tables SET table_connection_id = 1 WHERE table_real_name = 'sales_fact';
```

---

## Common Setup Patterns

### Pattern: Read-only access to lookup/reference tables
```sql
-- User can see genre and category lists but not change them
INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
VALUES (2, 7, 1, 0, 0, 0), -- genres table
       (2, 8, 1, 0, 0, 0); -- categories table
```

### Pattern: Allow a group to edit posts but not delete them
```sql
INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
VALUES (3, 4, 1, 1, 1, 0);
```

### Pattern: Give a user email X access to four tables with read-only on relation tables
```sql
-- 1. Create a group for this user's role
INSERT INTO groups (group_name, group_desc) VALUES ('ContentEditors', 'Edit content, view references');

-- 2. Create the user
INSERT INTO users (user_username, user_email, user_password) VALUES ('jdoe', 'jdoe@example.com', ?);
-- (hash the password with bcrypt first)

-- 3. Assign user to group
INSERT INTO users_groups (user_id, group_id)
VALUES ((SELECT user_id FROM users WHERE user_email = 'jdoe@example.com'),
        (SELECT group_id FROM groups WHERE group_name = 'ContentEditors'));

-- 4. Full CRUD on main tables
INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
SELECT g.group_id, t.table_id, 1, 1, 1, 1
FROM groups g, tables t
WHERE g.group_name = 'ContentEditors'
  AND t.table_real_name IN ('posts', 'comments');

-- 5. Read-only on relation/lookup tables
INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
SELECT g.group_id, t.table_id, 1, 0, 0, 0
FROM groups g, tables t
WHERE g.group_name = 'ContentEditors'
  AND t.table_real_name IN ('categories', 'tags');
```

### Pattern: Filter a table to only show relevant records
```sql
-- A "My Invoices" view showing only the logged-in user's data
-- (requires a custom query; Mystery doesn't have row-level security natively)
UPDATE tables
SET table_default_query = 'SELECT * FROM invoices WHERE status = ''active'''
WHERE table_real_name = 'invoices';
```

### Pattern: Self-referencing FK (e.g., employee reports-to)
```sql
INSERT INTO foreign_keys (local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field)
VALUES (
  (SELECT table_id FROM tables WHERE table_real_name = 'employees'),
  'reports_to',
  (SELECT table_id FROM tables WHERE table_real_name = 'employees'),
  'employee_id',
  'first_name,last_name'
);
```

---

## Connecting to a New Database

### Step-by-step (manual)
1. Set `TARGET_DB` in `.env`
2. Run `npm start`, log in as admin
3. **Admin → Tables → Add Table** for each table you want to manage
4. **Admin → Groups → Add Group** — create groups for each access role
5. **Admin → Groups → Permissions** — set CRUD flags per table per group
6. **Admin → Users → Add User** — create user accounts, assign to groups
7. For FK dropdowns: insert rows into `foreign_keys` table directly (no admin UI yet — see SQL examples in the Foreign Keys section above)

### Connection string formats
```
mysql://user:password@localhost:3306/database_name
sqlite:///absolute/path/to/file.db
sqlite://./relative/path/to/file.db
```

### Remote database (no server required)
You can run Mystery locally and point it at a remote database. Mystery only needs to be accessible in your own browser — it never needs to be exposed to the internet.

**Direct connection:**
```
TARGET_DB=mysql://user:password@db.example.com:3306/myapp
```

**Via SSH tunnel** (run in a separate terminal):
```bash
ssh -L 3307:localhost:3306 user@remote-host
# Then use:
TARGET_DB=mysql://user:password@127.0.0.1:3307/myapp
```

---

## API Summary

All responses follow `{ status, message, data }` structure. All non-auth routes require a valid `mystery_session` cookie, unless `NO_AUTH=true` is set (see README's Environment Variables section) — in which case every request is auto-authenticated as `NO_AUTH_USER`, no cookie needed.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | `{username, password}` → sets session cookie |
| POST | `/api/auth/logout` | Clears session |
| GET  | `/api/auth/me` | Returns current user + `passwordIsDefault` flag |
| GET  | `/api/auth/branding` | Returns `{logoUrl, appName, subtitle}` — no auth required |
| GET  | `/api/menu` | Tables and plugins visible to current user |
| GET  | `/api/records/:tableId` | List records — params: `page`, `rows`, `orderBy`, `dir`, `q` |
| GET  | `/api/records/:tableId/:pk` | Single record |
| POST | `/api/records/:tableId` | Insert record |
| PUT  | `/api/records/:tableId/:pk` | Update record |
| DELETE | `/api/records/:tableId/:pk` | Delete record |
| GET  | `/api/records/:tableId/fk-options/:field` | FK dropdown options |
| GET  | `/api/schema/:tableId` | Table config + field metadata + foreignKeys array |
| GET  | `/api/admin/tables` | List all tables (admin) |
| POST | `/api/admin/tables` | Create table config (admin) |
| PUT  | `/api/admin/tables/:id` | Update table config (admin) |
| DELETE | `/api/admin/tables/:id` | Delete table config (admin) |
| GET  | `/api/admin/groups` | List groups (admin) |
| POST | `/api/admin/groups` | Create group (admin) |
| PUT  | `/api/admin/groups/:id` | Update group name/desc (admin) |
| DELETE | `/api/admin/groups/:id` | Delete group (admin; group_id=1 protected) |
| GET  | `/api/admin/groups/:id/permissions` | Get permission matrix for a group (admin) |
| PUT  | `/api/admin/groups/:id/permissions` | Batch upsert permissions (admin) — body: `[{tableId, selectAccess, insertAccess, updateAccess, deleteAccess}]` |
| GET  | `/api/admin/users` | List users (admin) |
| POST | `/api/admin/users` | Create user — body: `{user_username, user_email, user_password, user_first_name?, user_last_name?, group_ids?}` (admin) |
| PUT  | `/api/admin/users/:id` | Update user / change password / reassign groups (admin) |
| DELETE | `/api/admin/users/:id` | Delete user (admin; user_id=1 protected) |

---

## Config Database Tables Reference

Mystery's own config lives in `mystery.db` (or whatever `CONFIG_DB_PATH` points to). The target database is never modified.

| Table | Purpose |
|-------|---------|
| `users` | Login accounts (bcrypt passwords) |
| `groups` | Named roles |
| `users_groups` | User ↔ group membership |
| `sessions` | Active login sessions (4-hour TTL) |
| `tables` | Table configurations |
| `groups_tables` | CRUD permissions per group per table |
| `foreign_keys` | FK relationships for dropdown fields |
| `triggers` | Before/after CRUD hook registrations |
| `table_views` | Named custom views per table (future UI) |
| `group_hidden_fields` | Fields hidden for a group on a table |
| `group_view_only_fields` | Fields read-only for a group on a table |
| `plugins` | Registered plugins |
| `connections` | Additional target DB connections |
| `audit_log` | Automatic log of all insert/update/delete operations |
| `mystery_settings` | Key/value store for branding overrides (app_name, subtitle, logo_url) |

---

## Limitations to Know

- No row-level security (table-level permissions only; use `table_default_query` to filter rows)
- No built-in HTTPS — use a reverse proxy (see `DEPLOYMENT.md`)
- Foreign key relationships are configured via direct SQL (no admin UI yet — see FK section above for INSERT patterns)
- Hook/trigger registrations are configured via direct SQL (no admin UI yet — see Hooks section above)
- Plugin JS files must be manually placed in `src/plugins/` — no upload UI
- `table_default_query` must be a SELECT statement; Mystery wraps it in a subquery for search and pagination
- Multiple target DB connections are configured via direct SQL on the `connections` table (no admin UI yet)
