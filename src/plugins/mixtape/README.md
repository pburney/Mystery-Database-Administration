# Mixtape — example plugin

A small, complete plugin that ships with Mystery 6 as a reference. It lets you
build **mixtapes** out of the Chinook sample music library: create a mixtape,
search the track catalogue, and add songs to it — with running track counts and
durations.

Enabled automatically by the Chinook demo (`npm run demo`). Log in and look for
the **Mixtape** card on the menu.

## What it demonstrates

- **A plugin that owns its own data.** `mixtapes` and `mixtape_tracks` are the
  plugin's own tables, created on first use via `CREATE TABLE IF NOT EXISTS`
  ([`lib/schema.js`](lib/schema.js)) — no migration step.
- **A plugin that reads the host app's data.** Track search and mixtape listings
  join out to Chinook's `Track` / `Album` / `Artist`. Chinook's own `Playlist`
  data is never touched.
- **The backend contract** ([`index.js`](index.js)): default-export an Express
  `Router`; reach the databases with `getConfigDb()` + `getTargetAdapter(...)`;
  guard routes with `requireLogin`; return `{ status, message, data }`.
- **The frontend contract** ([`public/mixtape.js`](public/mixtape.js)): export
  `async render(root)`; use relative imports (`../../js/api.js`) so it survives a
  subpath deployment. The file must be named `<plugin_key>.js`.
- **Pure logic + a unit test.** Clock formatting lives in
  [`public/format.js`](public/format.js) and is covered by
  [`tests/format.test.js`](tests/format.test.js) (`npm test`).

## Layout

```
mixtape/
├── index.js            # Express Router, mounted at /api/plugins/mixtape
├── lib/schema.js       # DDL for the plugin's own tables
├── public/
│   ├── mixtape.js      # render(root) — loaded at #/plugin/mixtape
│   └── format.js       # pure helpers (shared with the test)
├── tests/format.test.js
└── README.md
```

## Registration

The plugin is a row in the config DB's `plugins` table. The Chinook demo adds it
in `scripts/setup-chinook.js`. For an existing install:

```sql
INSERT INTO plugins (plugin_key, plugin_label, plugin_route, is_active)
VALUES ('mixtape', 'Mixtape', '/api/plugins/mixtape', 1);
```
