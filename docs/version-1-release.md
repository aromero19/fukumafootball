# Version 1 release guide

## Status

Core application implementation is complete locally for review. Hosted deployment and final operator acceptance are pending. No production data was inserted or modified, no email was sent, and no Git commit/push was performed by this work.

Validation on September 10, 2026: 8 application logic tests; 6 email-worker tests; 31 embedded database tests; 31 real PostgreSQL tests plus 8 Supabase/Auth/concurrency tests; lint; production build. Unauthenticated production HTTP checks cover every family route, login, and every protected admin route. Browser inspection covers the home page, empty pick sheet, and login. Signed-in browser saves and real provider delivery require operator acceptance in a configured environment; they are not claimed as tested here. Private transaction logic and access denial were exercised with real SQL, Auth, and mocked email delivery in the isolated integration stack.

## Before deploying

1. Review the task-specific diff alongside existing uncommitted work. Keep unrelated changes intact and never stage credentials or .env.local.
2. Configure the app's public Supabase URL/key and server-only FUKUMA_DATABASE_URL. Atomic player/contact saves, default-theme selection and email operations depend on that connection. Confirm the connection targets the intended project and has the permissions described in README.md. Do not add the private schema to the Data API.
3. Configure a separate worker with FUKUMA_DATABASE_URL and RESEND_API_KEY. Use a verified sender address. Keep email disabled until sender, contacts and the queued backlog have been reviewed.
4. Obtain approval for the application deployment. No new schema migration is required. Never change hosted schema in the dashboard, reset the linked database, or rewrite applied migrations.
5. After deployment, verify admin login, authorization denial for a non-admin, a player/contact save, week publication/current selection, a game result/reopen confirmation, an audited correction, default/theme image fallback, and family save/retry using an explicitly designated test record. Do not create fictitious real players or alter real results as a smoke test.
6. With explicit authorization to send a test confirmation, run the worker once, verify provider receipt and outbox status, then configure the worker host's scheduler (for example every five minutes) and alert on nonzero exits. No scheduler was installed by this task. Do not schedule overlapping worker versions.

The operations database connection and provider key were absent from the local process/.env.local during review. Hosted environment values were not inspected or changed. Browser reads showed no current season or published weeks; an administrator must populate the actual league data before family launch.

## Weekly administration

1. Create/activate the season, create weeks, and add matchups with an explicit kickoff offset (example: 2026-09-13T14:25-06:00). Family kickoff displays use America/Denver. Kickoff itself does not lock picks.
2. Verify teams and schedule, publish the week, and set the current season/week. Unpublishing clears the week marker; deactivating a season clears its marker and prevents submissions while retaining history.
3. Add players and private contact emails. Players use their names on the honor system; this does not authenticate identity. Other players' picks for published weeks are public.
4. Maintain rules/message and themes. URL previews fall back through selected theme, Default, then a text team name. Images are decorative; team names remain visible. A stored-file upload workflow is deferred by agreement.
5. Record results and confirm each change. Tie credits recorded picks; missing picks earn no credit. TBD intentionally reopens a game. Remove a mistaken game only before picks exist; otherwise use results or confirmed audited pick corrections.
6. Review /admin/email for delivery health and recent audited activity. All email settings changes and explicit retry requests are audited. Queue status distinguishes saved submissions from provider delivery.

## Delivery safeguards and limits

The worker takes a database session advisory lock so competing updated workers do not send simultaneously. A manual retry checks the same lock. Each attempt is recorded before contacting Resend. Provider calls time out after 15 seconds. Errors retain jobs and return a nonzero process exit code; logs do not include raw provider/connection exceptions, contacts, or credentials.

The worker tries a pending message at most five times automatically, on separate scheduled runs. After any attempt, messages older than 23 hours are held for review. This conservative cutoff is based on outbox creation time; an old backlog message can get its first attempt but will require manual review after a failure. Resend retains idempotency keys for 24 hours ([provider documentation](https://resend.com/docs/dashboard/emails/idempotency-keys)). The database request UUID is reused as the provider key.

A crash after provider acceptance can leave an uncertain job. Check the provider before using Queue retry. The confirmation checkbox explicitly accepts possible duplicate delivery, including after idempotency expiry. The retry clears attempt/error state but preserves the request ID and saved pick snapshot. Sent messages cannot be requeued through this workflow. Contact or sender changes can cause a provider payload conflict on retry; inspect the provider and wait for the idempotency window as appropriate instead of repeatedly sending.

The worker's email body renders only games represented in the saved confirmation. No pick is invented for a locked/unpicked or subsequently added game. Email failure never rolls back scoring data.

## Boundaries

- App submissions validate size/IDs and retry SQL deadlock/serialization failures with the same payload and request ID. Pending controls are disabled; stale player-selection reads cannot overwrite newer choices. Repeated submission clicks without edits reuse the successful key.
- A per-process 30-per-minute request guard provides best-effort burst protection. It is not distributed and cannot cover direct public RPC traffic. Stronger abuse protection requires provider/gateway controls; selected player names remain an intentional honor system.
- Inactive historical entries are available in Results. Published seasons/weeks are navigable in Results/Standings; there is no separate /history route.
- Historical file import, team-registry editing, image uploads, bulk scheduling imports, family accounts and arbitrary mass email are not in the agreed version-1 scope. Team IDs remain migration-owned. No exports were supplied for historical import.
