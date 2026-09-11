# Phase 2 database contract

Status: the original Phase 2 schema contract is implemented. The project handoff reports migrations 20260910000001–20260910000004 applied to the hosted project. The version-1 family/admin application and email worker are implemented locally; see version-1-release.md for current validation and deployment gates.

## Scope and decisions

Fukuma Football is a family NFL Pick'em league. Version 1 uses an honor system:
any visitor can select an Entry and submit its picks. There are no family accounts,
passwords, private links, or claims that name selection proves identity. Public
read access includes other players' picks for published weeks. Emails are private.
Administrators require Supabase Auth plus an explicit administrator allowlist.

The schema uses unquoted singular snake_case names. Import mapping preserves the
charter's Entry, Team, Game, Pick terminology and IDs:

| Charter | Database | Key relationships |
| --- | --- | --- |
| Entry | `public.entry` | `entry_id`; public first/last name and active flag |
| Entry.Email | `private.entry_contact` | One email per `entry_id` |
| Team | `public.team` | Fixed IDs 1–32; 33 Tie; 34 TBD |
| Season | `public.season` | `year`; active and current are separate flags |
| Week | `public.week` | `(year, week)`; publication and current-week flags |
| Game | `public.game` | `game_id`; valid week, away/home teams and winner |
| Pick | `public.pick` | `pick_id`; unique `(entry_id, game_id)` |
| Theme | `public.theme` | Named cosmetic theme; one default at most |
| TeamThemeImage | `public.team_theme_image` | One image per `(team_id, theme_id)` |
| WeeklySubmission | `public.weekly_submission` | One `(entry_id, year, week)`; theme, timestamp, revision |

Reference teams and the Default theme are migration data, not a disposable seed.
No real players, emails, games, admin identities, or credentials are committed.
Weeks permit 1–22 to accommodate historical/postseason exports without assuming
every season contains 18 regular-season weeks. UI week options come from the DB.
Game time is optional for historical imports and is stored as `timestamptz`.

## Migration sequence

1. `20260910000001_core.sql`: explicit default permissions, core relations,
   historical team registry, foreign keys and indexes.
2. `20260910000002_submission_and_admin.sql`: themes, submissions, atomic
   submission function, private admin/email records, audited corrections.
3. `20260910000003_access_and_standings.sql`: RLS, explicit grants, admin email
   functions, caller-permission views for scores and latest theme.

Default permission changes apply to future objects created by `postgres`, the
migration role. They do not alter Supabase-managed schemas or defaults belonging
to `supabase_admin`. Create application objects only through migrations under
`postgres`; every new exposed table needs RLS and deliberate grants/policies.

## Pick and submission contract

The application backend calls `submit_weekly_picks` with:

```json
{
  "p_entry_id": 1,
  "p_year": 2026,
  "p_week": 1,
  "p_theme_id": 1,
  "p_request_id": "a fresh UUID generated once for this submission attempt",
  "p_picks": [{ "game_id": 100, "team_id": 10 }]
}
```

- Supply all open games. Locked games can be omitted or echoed unchanged.
- Only matchup teams are legal selections. Tie/TBD are result markers only.
- `win_team_id = 34` means open, even after kickoff. Every other valid winner
  locks the game; returning a result to 34 intentionally reopens it.
- Player and season must be active, week published, and theme active. A contact
  email is optional after migration 20260911000001. Historical/inactive seasons remain readable.
- The function atomically validates picks, upserts them, updates the weekly
  theme/timestamp/revision, and creates a private email-outbox row.
- Preserve a request UUID across retries of the **same payload**, including array
  order. Reusing it for different content fails. A new intentional submission gets
  a new UUID and confirmation. A retry after a result is entered returns the saved
  confirmation without changing the now-locked pick.
- Responses report `email_status: queued` with a contact, or `not_queued` without one;
  neither claims delivery. Private receipts with `skipped_at` preserve retry identity
  without becoming delivery jobs, even if an email is added later.
- The UI treats SQL validation errors as failed submissions; it must not show a
  saved/sent success state for a failed transaction.

Submissions lock the week and its games; game changes also lock the week. This
serializes game additions/results with submission validation. Simultaneous admin
updates can deadlock with a submission; PostgreSQL rolls one transaction back.
The backend must retry SQLSTATE `40P01` / `40001` with bounded backoff and the same
request UUID. Actual two-connection tests remain a release gate (see below).

Family roles cannot write Pick or WeeklySubmission tables directly. The privileged
submission function is the sole family write path. `guard_pick` additionally
checks matchup validity for imports and administrator corrections. Admins use
`admin_correct_pick` with a nonempty reason to intentionally correct locked picks;
the old/new values and actor are audited. Admin result changes are also audited.
Game teams/year/week cannot change once picks exist. Admin UI must confirm result
changes, reopening games, and corrections before invoking the database operation.

The application backend should perform input size validation and rate limiting
before calling the RPC. The RPC itself is callable with the public Supabase key;
version 1 deliberately does not authenticate a selected Entry. API gateway controls
are needed if later abuse protection must cover direct RPC traffic too.

## Privacy and administrator operations

All application tables have RLS. Views use `security_invoker` so unpublished weeks
and games stay hidden to family callers. Public player rows contain no email.
Inactive names remain visible for historical results.

An authenticated user is not automatically an administrator. `private.admin_user`
is an explicit allowlist keyed to `auth.users.id`. There is no self-enrollment
function or public grant to edit this allowlist. Bootstrap the first admin later
through an authorized, trusted operator connection after creating the Auth user;
this is identity data, not a schema migration containing a personal user ID.

Admin RLS permits Entry/Season/Week/Game/Theme/TeamThemeImage/league-settings CRUD.
Team IDs/names are a migration-owned historical registry. Changing an admin's own
user metadata does not grant privileges. `admin_entry_email` and
`admin_set_entry_email` expose contact management only to allowlisted admins.
The `private` schema must not be added to the Data API's exposed schemas.

Rules and league messages are plain text. The future UI must render them as text
or sanitize any supported Markdown/HTML before rendering. `private.email_settings`
holds nonsecret sender/reply-to configuration. A future authorized backend handles
email configuration and audit displays through a trusted connection or narrowly
scoped admin RPCs; those interfaces are not implemented in this phase.

## Scores, themes, and email

- `pick_result.correct` is 1 for a matching winner or a tie (33); TBD scores 0.
  A missing Pick receives no credit, including tied games, following the charter's
  rule that the **pick** receives credit. No manually maintained score totals exist.
- Weekly/season standings share ranks for equal scores. Always order the query by
  `correct_picks DESC, name_first, name_last, entry_id` for deterministic display.
  Filter explicitly by year (and week for weekly results).
- Active entries appear with zero scores; inactive entries appear where historical
  picks exist. Historical seasons cannot leak into current-season totals.
- Load `latest_entry_theme` for the player. If absent or the selected theme is now
  inactive, use the current Default theme. If a team lacks an active image in that
  theme, fall back to its Default image, then a text/team-name placeholder.
- Theme changes on the page are cosmetic until submission. There is no ThemeID on
  Pick and no preference-history table. The email queue contains delivery snapshots,
  not scoring or theme-preference history.
- A later server-only worker reads unsent outbox rows and the player's private
  contact, sends the saved pick snapshot, then records `sent_at`. Provider credentials
  live only in server environment configuration. Email is disabled by default until
  configured. Retain failed jobs for retry; never roll back a saved pick because a
  provider is unavailable. Use the request UUID as a provider idempotency key where
  supported; delivery is not claimed to be exactly-once across provider failures.
- Service-role access is limited here to private contact/settings reads and outbox
  reads/updates through a trusted server connection. No browser service-role client.

## Application increments after schema review

| Family route | Purpose |
| --- | --- |
| `/` | Current season/week, message, standings, make-picks link |
| `/picks` | Name selection, season/week navigation, themes, submission |
| `/standings` | Season/weekly score views |
| `/results` | Games, results and selected player's picks |
| `/history` | Previous seasons/weeks |
| `/rules` | Admin-managed rules |

Protected admin routes: `/admin/login`, `/admin`, `/admin/players`, `/admin/teams`,
`/admin/themes`, `/admin/seasons`, `/admin/weeks`, `/admin/games`, `/admin/picks`,
`/admin/standings`, `/admin/rules`, `/admin/email`, `/admin/import`.
Normal administration uses the application backend; it must not require the old
Python script, manually issued REST requests, or dashboard SQL. These pages and
the email worker are later increments, not part of this migration diff.

## Historical import strategy

Build preview/validation first when actual exports are available. Preserve EntryID,
GameID, PickID and the exact TeamID mapping. Import in a transaction through an
authorized operator/backend, never through the family RPC (historical results are
already locked and may not have a weekly submission or theme).

Load teams/reference validation, entries/contacts, seasons/weeks, games, then picks.
Reject duplicate IDs or `(entry_id, game_id)` picks, invalid matchup choices,
missing foreign keys and out-of-range weeks. Keep inactive former players. Treat
33/34 as result markers. Do not fabricate WeeklySubmission rows for legacy data
that lacks submission/theme metadata. Preview conflicts rather than silently
overwriting current data; keep raw exports and email addresses out of Git.

After importing explicit identity IDs, reset each relevant identity sequence to
at least its maximum imported ID **without moving an already higher sequence
backward**, before accepting new inserts. The future importer must perform this
under exclusive import coordination and test that subsequent IDs do not collide.
Constraints support this workflow; a full import UI/parser is not yet implemented.

## Local validation and deployment gate

```powershell
npm.cmd ci
npm.cmd run test:db
npm.cmd run lint
npm.cmd run build
```

`test:db` replays the actual migration files in a fresh in-memory PGlite PostgreSQL
database (pinned to PostgreSQL 17), with synthetic Supabase roles/Auth helpers and synthetic data. It never
reads `.env.local`, connects to the linked project, or sends email. PGlite is a dev
dependency only. It verifies real PostgreSQL SQL, constraints, RLS, functions and
views, but is not a substitute for the full Supabase stack or concurrent sessions.

Once Docker Desktop's WSL 2 engine is running, before any hosted application:

```powershell
npm.cmd run test:db:integration
```

This runner copies the migrations/config into a fresh ignored
`.supabase-integration/<run-id>/` directory. It starts its own random project on
ports 55320–55329, resets **only that disposable local database**, and runs database
lint plus the same database tests against real Supabase PostgreSQL. It then tests
both orderings of submission/result races, game additions, concurrent repeated
request IDs, and simultaneous resubmissions using separate connections and
observed PostgreSQL lock waits. Real PostgREST and Auth checks verify email
privacy, unpublished-week visibility, direct-write denial, and the admin allowlist.

CLI status credentials are captured in memory and never logged or written to Git.
The connection helper rejects linked workspaces, non-loopback hosts, and ports
outside the dedicated test endpoints. The runner stops its generated stack without
saving its database when finished. Generated configuration remains in the ignored
directory; it does not copy `.env.local` or the hosted project link.

Integration execution passes with Docker/WSL available. A successful embedded
test run or syntax check does not mark these integration tests as passed.

After passing those gates, inspect the linked migration list and the deployment
dry run. Obtain hosted-deployment approval before executing `supabase db push`.
Review the SQL diff rather than running schema changes in the dashboard. Never
reset the linked database. Never repair migration history to hide divergence.
Once deployed, add forward migrations; do not rewrite applied migration files.

Reference guidance: [Supabase function permissions](https://supabase.com/docs/guides/database/functions),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PGlite runtime](https://pglite.dev/docs/).
