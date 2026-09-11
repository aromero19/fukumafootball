# Optional player email rollout

Migration 20260911000001 applied to production with user approval and verified
in hosted migration history. Application deployment and browser acceptance
follow this migration; email delivery remains disabled.

The existing form requires email, `admin_set_entry_email` inserts a non-null
contact, and `submit_weekly_picks` rejects players without contacts. These are
the demonstrated gaps addressed by migration 20260911000001.

An absent contact now means no confirmation delivery. Submissions still save
picks and an immutable private request receipt, marked `skipped_at`, so retries
cannot duplicate picks or increment revisions. Adding an email later does not
send old skipped receipts. Clearing an existing contact skips its unsent jobs.
Sent receipts and all existing picks, games, players and contacts are preserved.

The contact RPC retains its admin check and coordinates with the worker's
advisory lock and the submission's entry lock. If delivery is running, contact
changes fail for retry rather than racing a send. The worker filters skipped
receipts, and manual retry cannot requeue them. No new public tables or private
schema exposure are introduced. Email syntax validation still applies when a
nonblank address is entered.

## Deployment order (requires explicit approval)

1. Keep delivery disabled and any old worker stopped. Inspect hosted migration
   history and the migration dry run before applying this one forward migration
   through the migration tooling, never dashboard SQL.
2. Deploy the matching application and worker code. The updated code requires
   `skipped_at`; do not deploy it before the migration. Do not run an old worker
   against skipped receipts, because it does not understand this flag.
3. Add the user-supplied players with blank email through the production admin
   form. Verify their persisted names and active state. Do not invent test players
   or submit real picks just to test deployment.
4. Email setup and authorized delivery verification remain separate launch gates.

Rollback must keep email disabled; never drop receipts or rewrite applied
migrations. Use a reviewed forward fix if required.

## Validation

- Embedded PostgreSQL: 35 tests passed.
- Isolated Supabase: 35 database tests and 11 Auth/API/concurrency tests passed;
  database lint passed. Both contact-removal/submission orderings and the live
  worker lock are covered. Provider delivery is mocked; no emails were sent.
- Family, worker and credential-safety tests: 16 passed.
- ESLint, production build and diff whitespace checks passed.
- Production browser acceptance remains pending approved deployment.
