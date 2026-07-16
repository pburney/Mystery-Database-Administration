// Mixtape — an example Mystery 6 plugin.
//
// It demonstrates the two things a plugin most often needs: owning its own data
// (the `mixtapes` / `mixtape_tracks` tables) and reading the host app's existing
// data (Chinook's Artist / Album / Track). Build custom mixtapes out of the
// sample music library without touching Chinook's own playlists.
//
// The loader (src/plugins/loader.js) imports this file and mounts the default
// export at /api/plugins/mixtape. A plugin receives no arguments — it reaches
// the databases by importing the engine's own modules, exactly as a route file
// in src/routes/ would.
import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import { getConfigDb } from '../../db/config-db.js';
import { getTargetAdapter } from '../../db/target-db.js';
import { MIXTAPE_SCHEMA } from './lib/schema.js';

const router = Router();

// The target adapter's async API (src/db/adapters/sqlite-adapter.js):
//   select(sql, params) -> rows
//   execute(sql, params) -> number of changed rows
//   insert(table, obj)   -> lastInsertRowid
const adapter = () => getTargetAdapter(getConfigDb());

// Create our tables once per process, lazily on first request. Doing this at
// request time (rather than top-level await) means it runs after TARGET_DB is
// configured, and works against whatever database the app is pointed at.
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  for (const stmt of MIXTAPE_SCHEMA) await db.execute(stmt);
  schemaReady = true;
}

const ok = (res, data, message = 'ok') => res.json({ status: 'ok', message, data });
const fail = (res, code, message) => res.status(code).json({ status: 'error', message, data: null });

// --- Mixtapes -------------------------------------------------------------

// List every mixtape with its track count and total running time. The COUNT
// and SUM come from joining our own mixtape_tracks to Chinook's Track — one
// query spanning plugin-owned and host-owned tables (they share the DB).
router.get('/mixtapes', requireLogin, async (req, res, next) => {
  try {
    const db = adapter();
    await ensureSchema(db);
    const rows = await db.select(
      `SELECT m.MixtapeId, m.Name, m.CreatedAt,
              COUNT(mt.TrackId)         AS TrackCount,
              COALESCE(SUM(t.Milliseconds), 0) AS TotalMs
       FROM mixtapes m
       LEFT JOIN mixtape_tracks mt ON mt.MixtapeId = m.MixtapeId
       LEFT JOIN Track t           ON t.TrackId   = mt.TrackId
       GROUP BY m.MixtapeId
       ORDER BY m.CreatedAt DESC, m.MixtapeId DESC`
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

router.post('/mixtapes', requireLogin, async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return fail(res, 400, 'A mixtape name is required');

    const db = adapter();
    await ensureSchema(db);
    const id = await db.insert('mixtapes', { Name: name });
    const [row] = await db.select(
      `SELECT MixtapeId, Name, CreatedAt FROM mixtapes WHERE MixtapeId = ?`, [id]
    );
    ok(res, row, 'Created');
  } catch (err) { next(err); }
});

// One mixtape plus its tracks, in order. Joins out to Album/Artist for display.
router.get('/mixtapes/:id', requireLogin, async (req, res, next) => {
  try {
    const db = adapter();
    await ensureSchema(db);
    const [mixtape] = await db.select(
      `SELECT MixtapeId, Name, CreatedAt FROM mixtapes WHERE MixtapeId = ?`, [req.params.id]
    );
    if (!mixtape) return fail(res, 404, 'Mixtape not found');

    const tracks = await db.select(
      `SELECT mt.Position, t.TrackId, t.Name AS TrackName, t.Milliseconds,
              al.Title AS Album, ar.Name AS Artist
       FROM mixtape_tracks mt
       JOIN Track t        ON t.TrackId   = mt.TrackId
       LEFT JOIN Album al  ON al.AlbumId  = t.AlbumId
       LEFT JOIN Artist ar ON ar.ArtistId = al.ArtistId
       WHERE mt.MixtapeId = ?
       ORDER BY mt.Position`,
      [req.params.id]
    );
    ok(res, { ...mixtape, tracks });
  } catch (err) { next(err); }
});

router.delete('/mixtapes/:id', requireLogin, async (req, res, next) => {
  try {
    const db = adapter();
    await ensureSchema(db);
    // mixtape_tracks rows go with it via ON DELETE CASCADE (foreign_keys = ON).
    const changes = await db.execute(`DELETE FROM mixtapes WHERE MixtapeId = ?`, [req.params.id]);
    ok(res, { changes }, changes ? 'Deleted' : 'Not found');
  } catch (err) { next(err); }
});

// --- Track library (read-only over Chinook) -------------------------------

router.get('/tracks', requireLogin, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return ok(res, []);

    const db = adapter();
    const like = `%${q}%`;
    const rows = await db.select(
      `SELECT t.TrackId, t.Name AS TrackName, t.Milliseconds,
              al.Title AS Album, ar.Name AS Artist
       FROM Track t
       LEFT JOIN Album al  ON al.AlbumId  = t.AlbumId
       LEFT JOIN Artist ar ON ar.ArtistId = al.ArtistId
       WHERE t.Name LIKE ? OR ar.Name LIKE ? OR al.Title LIKE ?
       ORDER BY t.Name
       LIMIT 25`,
      [like, like, like]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

// --- Tracks on a mixtape --------------------------------------------------

router.post('/mixtapes/:id/tracks', requireLogin, async (req, res, next) => {
  try {
    const trackId = Number(req.body?.trackId);
    if (!Number.isInteger(trackId)) return fail(res, 400, 'A numeric trackId is required');

    const db = adapter();
    await ensureSchema(db);

    const [mixtape] = await db.select(`SELECT MixtapeId FROM mixtapes WHERE MixtapeId = ?`, [req.params.id]);
    if (!mixtape) return fail(res, 404, 'Mixtape not found');
    const [track] = await db.select(`SELECT TrackId FROM Track WHERE TrackId = ?`, [trackId]);
    if (!track) return fail(res, 404, 'Track not found');

    const [{ NextPos }] = await db.select(
      `SELECT COALESCE(MAX(Position), 0) + 1 AS NextPos FROM mixtape_tracks WHERE MixtapeId = ?`,
      [req.params.id]
    );
    // A track appears at most once per mixtape (composite PK) — silently no-op
    // if it's already there rather than erroring.
    const changes = await db.execute(
      `INSERT OR IGNORE INTO mixtape_tracks (MixtapeId, TrackId, Position) VALUES (?, ?, ?)`,
      [req.params.id, trackId, NextPos]
    );
    ok(res, { added: !!changes }, changes ? 'Added' : 'Already on this mixtape');
  } catch (err) { next(err); }
});

router.delete('/mixtapes/:id/tracks/:trackId', requireLogin, async (req, res, next) => {
  try {
    const db = adapter();
    await ensureSchema(db);
    const changes = await db.execute(
      `DELETE FROM mixtape_tracks WHERE MixtapeId = ? AND TrackId = ?`,
      [req.params.id, req.params.trackId]
    );
    ok(res, { changes }, changes ? 'Removed' : 'Not found');
  } catch (err) { next(err); }
});

export default router;
