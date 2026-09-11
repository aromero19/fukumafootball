# Fukuma Football

A family NFL Pick'em league built with Next.js 16.3.4 and Supabase. Version 1 uses honor-system player selection, public picks for published weeks, and authenticated allowlisted administrators. Images remain HTTPS URLs for this release.

## Version 1 workflows

- Family: current league message, picks with conflict retries and duplicate protection, season/weekly standings, historical season navigation, player-specific saved picks/results (including inactive players), and rules.
- Admin: sign-in/session refresh/sign-out; atomic player/contact saves; active/current seasons and published/current weeks; game creation, results/reopening, kickoff updates, removal before picks exist; theme activation/default selection and team image URLs; confirmed, audited pick corrections; email settings, queue inspection, and deliberate retries.
- Email: separate server-only Resend worker. A saved pick queues a confirmation; no application page claims delivery before the worker records it.

## Configuration

Configure these through the server environment or an ignored local environment file. Never commit credentials.

| Variable | Used by | Purpose |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | App/browser | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | App/browser | Public application key; permissions remain controlled by RLS |
| FUKUMA_DATABASE_URL | App server and worker only | Trusted PostgreSQL connection for private operations and atomic transactions |
| RESEND_API_KEY | Worker only | Resend delivery credential |
| FUKUMA_EMAIL_BATCH_SIZE | Worker only, optional | Messages per run, 1–100; default 25 |

FUKUMA_DATABASE_URL must be a trusted operator connection with access to private.admin_user, private.email_settings, private.admin_audit, private.email_outbox, and the ability to SET LOCAL ROLE authenticated for player/default-theme writes. The existing service_role grants are insufficient for settings writes. Use a direct or session-pooled PostgreSQL connection with proper TLS verification; **do not use transaction pooling for the worker's session advisory lock**. Never configure this variable with a NEXT_PUBLIC prefix. Access is verified with Supabase Auth and rechecked against the allowlist inside each operations transaction. No private schema is exposed through the Data API.

Without this connection, family pages and ordinary Supabase admin operations still work, but player/contact saves, default-theme switching, and private email operations explicitly report that setup is required. This is a deployment requirement, not optional functionality.

## Development and validation

Run npm.cmd ci, then npm.cmd run dev. Open http://localhost:3000.

Run these release checks:

~~~powershell
npm.cmd run test:app
npm.cmd run test:email-worker
npm.cmd run test:db
npm.cmd run test:db:integration
npm.cmd run lint
npm.cmd run build
~~~

Integration tests require Docker Desktop/WSL 2 and Docker on PATH. They use only a disposable local Supabase stack on ports 55320–55329. They never reset the linked hosted project or send real email.

For production, run npm.cmd run build and npm.cmd run start, or deploy the reviewed app through the configured hosting workflow. Hosted changes require explicit approval.

## Operation

See [the version-1 release guide](docs/version-1-release.md) for launch configuration, weekly operation, delivery/retry behavior, and remaining release gates. See [the database contract](docs/phase-2-database.md) for SQL/RLS business rules and migration discipline.

The worker reads process environment variables. The email:send command does not automatically load .env.local. Inject its environment through the worker host or use your trusted environment launcher. Run npm.cmd run email:send separately; no website request sends mail.

Migrations 20260910000001 through 20260910000004 are the existing schema, reported deployed in the project handoff. No migration was added by this version-1 completion work. Historical imports and stored-file image uploads are deferred.
