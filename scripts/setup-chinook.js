#!/usr/bin/env node
// One-time demo setup — configures Mystery to browse the Chinook sample database.
// Run with: npm run demo

import { copyFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { applySchema } from '../src/db/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const chinookSrc  = resolve(ROOT, 'examples', 'Chinook_Sqlite.sqlite');
const chinookDest = resolve(ROOT, 'examples', 'chinook-demo.sqlite');
const configDest  = resolve(ROOT, 'examples', 'mystery-chinook.db');
const envDest     = resolve(ROOT, '.env.demo');

if (!existsSync(chinookSrc)) {
  console.error('Error: examples/Chinook_Sqlite.sqlite not found.');
  process.exit(1);
}

// Copy target database
if (existsSync(chinookDest)) {
  console.log('  chinook-demo.sqlite already exists — skipping copy');
} else {
  copyFileSync(chinookSrc, chinookDest);
  console.log('  Copied Chinook database to chinook-demo.sqlite');
}

// Reset config database
if (existsSync(configDest)) {
  console.log('\n  mystery-chinook.db already exists. Delete it and re-run to reset.\n');
  process.exit(0);
}

const db = new Database(configDest);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
applySchema(db);
console.log('  Created mystery-chinook.db');

// Groups
db.prepare(`INSERT INTO groups (group_id, group_name, group_desc) VALUES (1, 'Administrators', 'Full system access')`).run();
db.prepare(`INSERT INTO groups (group_name, group_desc) VALUES ('Viewers', 'Read-only access to all tables')`).run();
const viewersGroupId = db.prepare(`SELECT group_id FROM groups WHERE group_name = 'Viewers'`).get().group_id;

// Users
const adminHash = bcrypt.hashSync('admin', 12);
const adminRow = db.prepare(
  `INSERT INTO users (user_username, user_email, user_password, user_first_name, user_last_name, password_is_default)
   VALUES ('admin', 'admin@localhost', ?, 'Admin', 'User', 1)`
).run(adminHash);
db.prepare(`INSERT INTO users_groups (user_id, group_id) VALUES (?, 1)`).run(adminRow.lastInsertRowid);

const demoHash = bcrypt.hashSync('demo', 12);
const demoRow = db.prepare(
  `INSERT INTO users (user_username, user_email, user_password, user_first_name, user_last_name, password_is_default)
   VALUES ('demo', 'demo@localhost', ?, 'Demo', 'User', 0)`
).run(demoHash);
db.prepare(`INSERT INTO users_groups (user_id, group_id) VALUES (?, ?)`).run(demoRow.lastInsertRowid, viewersGroupId);

console.log('  Created users: admin/admin (administrator), demo/demo (viewer)');

// Table definitions
const tableDefs = [
  // [realName, displayName, pk, orderField, displayFields, dataWord, isManyToMany]
  ['Artist',       'Artist',        'ArtistId',      'Name',          'Name',                                      'Artist',     0],
  ['Album',        'Album',         'AlbumId',        'Title',         'Title,ArtistId',                            'Album',      0],
  ['Track',        'Track',         'TrackId',        'Name',          'Name,AlbumId,MediaTypeId,GenreId,UnitPrice', 'Track',      0],
  ['Genre',        'Genre',         'GenreId',        'Name',          'Name',                                      'Genre',      0],
  ['MediaType',    'Media Type',    'MediaTypeId',    'Name',          'Name',                                      'Media Type', 0],
  ['Playlist',     'Playlist',      'PlaylistId',     'Name',          'Name',                                      'Playlist',   0],
  ['PlaylistTrack','Playlist Track','PlaylistId',     'PlaylistId',    'PlaylistId,TrackId',                        'Entry',      1],
  ['Customer',     'Customer',      'CustomerId',     'LastName',      'FirstName,LastName,Email,Country',          'Customer',   0],
  ['Employee',     'Employee',      'EmployeeId',     'LastName',      'FirstName,LastName,Title,Email',            'Employee',   0],
  ['Invoice',      'Invoice',       'InvoiceId',      'InvoiceDate',   'CustomerId,InvoiceDate,BillingCountry,Total','Invoice',   0],
  ['InvoiceLine',  'Invoice Line',  'InvoiceLineId',  'InvoiceLineId', 'InvoiceId,TrackId,UnitPrice,Quantity',      'Line Item',  0],
];

const tableIds = {};
for (const [realName, displayName, pk, orderField, displayFields, dataWord, isMtM] of tableDefs) {
  const row = db.prepare(
    `INSERT INTO tables (table_real_name, table_display_name, table_primary_key, table_default_order_field,
                         table_default_display_fields, table_display_data_word, table_is_many_to_many)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(realName, displayName, pk, orderField, displayFields, dataWord, isMtM);
  tableIds[realName] = Number(row.lastInsertRowid);
}
console.log(`  Registered ${tableDefs.length} tables`);

// Viewer permissions (select-only on every table)
for (const tableId of Object.values(tableIds)) {
  db.prepare(
    `INSERT INTO groups_tables (group_id, table_id, select_access, insert_access, update_access, delete_access)
     VALUES (?, ?, 1, 0, 0, 0)`
  ).run(viewersGroupId, tableId);
}
console.log('  Set read-only permissions for Viewers group');

// Foreign key relationships
const fkDefs = [
  // [localTable, localField, foreignTable, valueField, labelField]
  ['Album',        'ArtistId',    'Artist',   'ArtistId',   'Name'],
  ['Track',        'AlbumId',     'Album',    'AlbumId',    'Title'],
  ['Track',        'MediaTypeId', 'MediaType','MediaTypeId','Name'],
  ['Track',        'GenreId',     'Genre',    'GenreId',    'Name'],
  ['Customer',     'SupportRepId','Employee', 'EmployeeId', 'FirstName,LastName'],
  ['Invoice',      'CustomerId',  'Customer', 'CustomerId', 'FirstName,LastName'],
  ['InvoiceLine',  'InvoiceId',   'Invoice',  'InvoiceId',  'InvoiceId'],
  ['InvoiceLine',  'TrackId',     'Track',    'TrackId',    'Name'],
  ['PlaylistTrack','PlaylistId',  'Playlist', 'PlaylistId', 'Name'],
  ['PlaylistTrack','TrackId',     'Track',    'TrackId',    'Name'],
  ['Employee',     'ReportsTo',   'Employee', 'EmployeeId', 'FirstName,LastName'],
];

for (const [local, localField, foreign, valueField, labelField] of fkDefs) {
  db.prepare(
    `INSERT INTO foreign_keys (local_table_id, local_table_field, foreign_table_id, foreign_table_value_field, foreign_table_label_field)
     VALUES (?, ?, ?, ?, ?)`
  ).run(tableIds[local], localField, tableIds[foreign], valueField, labelField);
}
console.log(`  Wired ${fkDefs.length} foreign key relationships`);

db.close();

// Write .env.demo
writeFileSync(envDest, [
  '# Auto-generated by npm run demo',
  '# Copy to .env then run: npm start',
  `TARGET_DB=sqlite://${chinookDest}`,
  `CONFIG_DB_PATH=${configDest}`,
  'SESSION_SECRET=chinook-demo-do-not-use-in-production',
  'PORT=3000',
  'HTTPS=false',
  'NODE_ENV=development',
  '',
].join('\n'));
console.log('  Wrote .env.demo');

const tableNames = tableDefs.map(t => t[1]).join(', ');
console.log(`
Setup complete!

  Next steps:
    cp .env.demo .env
    npm start

  Then open http://localhost:3000 and log in:
    admin / admin  — full admin access
    demo  / demo   — read-only viewer

  Tables: ${tableNames}
`);
