// The mixtape plugin owns two of its own tables in the *target* database
// (alongside Chinook's Artist/Album/Track). They're created on demand by
// index.js via CREATE TABLE IF NOT EXISTS, so the plugin works the moment it's
// dropped in — no separate migration step or setup script required.
//
// Exported as an array because the sqlite adapter's execute() runs a single
// statement per call (better-sqlite3 prepare().run()).
//
// Table + column names use Chinook's PascalCase so they read naturally next to
// the sample data. TrackId references Chinook's Track(TrackId) but is *not* a
// declared foreign key: the mixtape tables own their data, the music library is
// just something they read, so we don't couple their lifecycles.
export const MIXTAPE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mixtapes (
     MixtapeId INTEGER PRIMARY KEY AUTOINCREMENT,
     Name      TEXT NOT NULL,
     CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS mixtape_tracks (
     MixtapeId INTEGER NOT NULL REFERENCES mixtapes(MixtapeId) ON DELETE CASCADE,
     TrackId   INTEGER NOT NULL,
     Position  INTEGER NOT NULL,
     PRIMARY KEY (MixtapeId, TrackId)
   )`,
];
