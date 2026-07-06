# Mystery — Manual Testing Plan

This checklist covers the full user-facing feature set. Use it before open-source releases or after significant changes. Run through the entire plan at least once against the Chinook demo database.

## Setup

```bash
npm run demo        # Create Chinook demo database and .env.demo
cp .env.demo .env
npm start           # Server at http://localhost:3000
```

Two test accounts: `admin` / `admin` (full access), `demo` / `demo` (read-only viewer).

---

## Section A — Authentication

| # | Steps | Expected |
|---|-------|---------|
| A1 | Open http://localhost:3000 without logging in | Redirected to login page |
| A2 | Submit login form with username `admin`, wrong password | Error flash: "Invalid credentials" |
| A3 | Submit login form with both fields empty | Error or validation message |
| A4 | Log in as `admin` / `admin` | Redirected to main menu; nav shows "Admin" link |
| A5 | Click Logout | Redirected to login page |
| A6 | Log in as `demo` / `demo` | Menu appears with restricted table list |
| A7 | After login, reload the page | Still logged in (session persists) |
| A8 | **Rate limiting:** Submit wrong password 11 times in a row | 11th attempt returns HTTP 429 with "Too many login attempts" message |

---

## Section B — Menu & Navigation

| # | Steps | Expected |
|---|-------|---------|
| B1 | Log in as `admin`. View main menu | All 11 Chinook tables visible |
| B2 | Log in as `demo`. View main menu | All tables visible (Viewers group has select on all) |
| B3 | Log in as `demo`. Look for Add/Edit/Delete buttons | None visible (no insert/update/delete permission) |
| B4 | Log in as `admin`. Look for Admin link | Present in nav |
| B5 | Log in as `demo`. Look for Admin link | Not present in nav |

---

## Section C — List View

Using the **Artist** table (simplest) unless noted.

| # | Steps | Expected |
|---|-------|---------|
| C1 | Click Artist in menu | List loads; rows show Name column; "Add Artist" button present for admin |
| C2 | Change rows-per-page dropdown to 10 | List re-renders with 10 rows |
| C3 | Type "Beatles" in the search box | Returns "The Beatles" (1 result or none depending on data) |
| C4 | Search "a" | Multiple results; search is case-insensitive |
| C5 | Clear search | Full list returns |
| C6 | Click a column header to sort | List re-sorts; click again to reverse |
| C7 | Navigate to page 2 | Second page of artists loads |
| C8 | Open the **Track** table | List shows Name, AlbumId, MediaTypeId, GenreId, UnitPrice columns |
| C9 | In Track list, AlbumId column | Shows album title (FK resolved), not raw integer |

---

## Section D — CRUD Operations (as admin)

| # | Steps | Expected |
|---|-------|---------|
| D1 | Artist list → "Add Artist" | Form with Name field |
| D2 | Submit form with Name "Test Band 99" | Returns to list; new row visible; success message |
| D3 | Click "Test Band 99" in list | Detail view shows all fields |
| D4 | Click "Edit" on detail view | Edit form pre-populated |
| D5 | Change Name to "Test Band 99 (edited)" → Save | Redirected to view; updated name shown |
| D6 | Click "Delete" on "Test Band 99 (edited)" | Confirmation screen |
| D7 | Confirm delete | Returned to list; record gone |
| D8 | Add a Track record (via Track list → Add) | Form shows Album, MediaType, Genre as dropdowns |
| D9 | Cancel out of Add/Edit form | Returned to list with no changes |

---

## Section E — Foreign Keys

| # | Steps | Expected |
|---|-------|---------|
| E1 | Album list, view any row | ArtistId shows artist name, not a number |
| E2 | Track list, view any row | AlbumId, MediaTypeId, GenreId show labels |
| E3 | Edit an Album record | ArtistId field is a searchable `<select>` or dropdown, not raw input |
| E4 | Edit a Track record | AlbumId, MediaTypeId, GenreId are dropdowns with proper labels |
| E5 | Edit an Employee record | "Reports To" field shows employee name dropdown |
| E6 | Edit an Invoice Line | InvoiceId shows invoice number; TrackId shows track name |

---

## Section F — Permission Enforcement

| # | Steps | Expected |
|---|-------|---------|
| F1 | Log in as `demo`. Try navigating to `#/add/1` directly | 403 error or redirect to login |
| F2 | `demo` user: view Artist list | No "Add Artist" button; no "Edit" or "Delete" links |
| F3 | `demo` user: view any record detail | "View" only; no edit/delete buttons |
| F4 | `demo` user: call POST /api/records/1 directly (curl or browser DevTools) | HTTP 403 |

---

## Section G — Admin Panel

| # | Steps | Expected |
|---|-------|---------|
| G1 | Admin → Groups → Create group "Testers" | Group appears in list |
| G2 | Admin → Groups → Testers → Permissions | Permission matrix shows all tables |
| G3 | Enable select-only on Artist and Album for Testers | Save succeeds |
| G4 | Admin → Users → Create user `tester@example.com` / `TestPass1` | User created |
| G5 | Assign tester to "Testers" group | User shows Testers group |
| G6 | Log out; log in as `tester@example.com` with password `TestPass1` | Only Artist and Album in menu |
| G7 | Log back in as admin. Delete tester user | User gone from list |
| G8 | Delete Testers group | Group gone from list |
| G9 | Admin → Tables → view any table config | Fields present: real name, display name, PK, order field, etc. |

---

## Section H — Custom Query (Table Default Query)

| # | Steps | Expected |
|---|-------|---------|
| H1 | Admin → Tables → Track → Edit | `table_default_query` field is empty |
| H2 | Set `table_default_query` to `SELECT * FROM Track WHERE UnitPrice > 0.99` → Save | |
| H3 | Browse the Track list | Only tracks with UnitPrice > 0.99 appear |
| H4 | Search within the filtered list | Search applies within the filtered set |
| H5 | Clear `table_default_query` → Save | Full track list returns |

---

## Section I — Field Visibility

Requires direct DB access (`sqlite3 mystery-chinook.db`) or API calls to set up.

| # | Setup | Steps | Expected |
|---|-------|-------|---------|
| I1 | `INSERT INTO group_hidden_fields (table_id, group_id, field_name) VALUES (3, 2, 'Composer');` (Track, Viewers) | Log in as `demo`, view Track list | Composer column absent |
| I2 | (same setup) | Log in as `admin`, view Track | Composer visible |
| I3 | `INSERT INTO group_view_only_fields (table_id, group_id, field_name) VALUES (3, 2, 'UnitPrice');` | Log in as `demo`, edit a Track (if permitted) | UnitPrice visible in view, but not editable in form |
| I4 | Clean up: `DELETE FROM group_hidden_fields; DELETE FROM group_view_only_fields;` | | |

---

## Section J — Audit Log

| # | Steps | Expected |
|---|-------|---------|
| J1 | Log in as admin. Add an Artist, edit it, delete it | Three operations complete successfully |
| J2 | Inspect `mystery-chinook.db`: `SELECT * FROM audit_log;` | Three rows: insert, update, delete; `username` = "admin"; `table_name` = "Artist"; `ip_address` not null |
| J3 | Log in as `demo`. Browse artists (SELECT only) | No rows added to audit_log (reads are not logged) |

---

## Section K — Hooks (optional advanced test)

Requires creating a test hook file.

| # | Setup | Steps | Expected |
|---|-------|-------|---------|
| K1 | Create `src/plugins/test-hook/hooks/before-insert.js` with: `export default async function(ctx) { ctx.requestData.Name = (ctx.requestData.Name || '') + ' [hooked]'; }` | | |
| K2 | `INSERT INTO triggers (table_id, trigger_when, trigger_condition, trigger_function, sort_order) VALUES (1, 'before', 'insert', './src/plugins/test-hook/hooks/before-insert.js', 10);` | | |
| K3 | Restart the server | | |
| K4 | Add a new Artist with Name "Test Artist" | Saved record shows "Test Artist [hooked]" |
| K5 | Clean up: delete trigger row and test artist | | |

---

## Section L — Rate Limiting Verification

| # | Steps | Expected |
|---|-------|---------|
| L1 | Run 11 consecutive failed login attempts (wrong password) in the same browser | 11th response is HTTP 429 |
| L2 | Wait a few seconds and try again | Still blocked until the 15-minute window expires |
| L3 | (Optional) Verify successful login still works from a different IP/browser | Yes, rate limit is per IP |

---

## Automated Tests

```bash
npm test         # All tests must pass (32 tests across 5 suites)
npm run coverage # Coverage report
```

All 32 tests must be green before any release.
