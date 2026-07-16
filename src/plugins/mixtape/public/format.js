// Pure display helpers, shared by the frontend (mixtape.js) and exercised
// directly by the unit test (tests/format.test.js). No DOM, no DB — just
// milliseconds in, strings out. The server returns raw Milliseconds; all
// clock formatting happens here on the client.

// Milliseconds -> a clock string. Under an hour: "m:ss" (e.g. "3:07").
// An hour or more: "h:mm:ss" (e.g. "1:02:00"), which is what a full mixtape's
// running total usually lands at.
export function msToClock(ms) {
  const totalSec = Math.round((Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// Sum the Milliseconds of a list of track rows, returning both the raw total
// and its formatted clock. Missing/invalid Milliseconds count as zero.
export function totalDuration(tracks) {
  const ms = (tracks || []).reduce((sum, t) => sum + (Number(t?.Milliseconds) || 0), 0);
  return { ms, clock: msToClock(ms) };
}
