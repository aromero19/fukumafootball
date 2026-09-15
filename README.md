# Fukuma Football

## Historical archive

The 2016–2024 archive has been reconstructed and imported. **History** adds career totals, season/weekly accuracy graphs, and an archive coverage grid for current and inactive players. See [historical results](docs/historical-results.md) for recovery decisions, missing records, import commands, and validation. No schema migration is required for this update.

A family NFL Pick'em league built with Next.js 16.3.4 and Supabase. It uses honor-system player selection, public picks for published weeks, and authenticated allowlisted administrators. Profile and theme images support Supabase Storage uploads as well as HTTPS URLs. See [image upload setup](docs/image-uploads.md) for the required migration and server credential.

## Version 1 workflows

- Family: current league message, picks with conflict retries and duplicate protection, season/weekly standings, historical season navigation, player-specific saved picks/results (including inactive players), and rules.
- Admin: sign-in/session refresh/sign-out; atomic player/contact saves; active/current seasons and published/current weeks; game creation, results/reopening, kickoff updates, removal before picks exist; theme activation/default selection and team image URLs; confirmed, audited pick corrections; email settings, queue inspection, and deliberate retries.
- Email: separate server-only Resend worker. A saved pick queues a confirmation; no application page claims delivery before the worker records it.

## Automatic email on Vercel

See [Vercel email setup](docs/vercel-email.md) for immediate background confirmation delivery and production environment requirements. This supersedes the original separate-worker-only launch instructions below. Failed deliveries remain queued for recovery.

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

Migrations 20260910000001 through 20260910000004 are the existing schema, reported deployed in the project handoff. No migration was added by this version-1 completion work. Historical imports and stored-file image uploads are now supported; see their setup guides above.

## Profile photos and weekly pick summaries

Apply `supabase/migrations/20260915000001_profile_photos.sql` before deploying this update. It adds the nullable `entry.photo_url` column and retains existing administrator-only write permissions.

In **Admin → Players → Profile photos**, paste a publicly accessible HTTPS image URL for each player. Clear the URL to restore the gray silhouette. Square images work best; profiles render at 96 × 96 pixels, and the submitted game summaries use 36 × 36 pixels. Missing or broken images fall back to the silhouette.

**Make picks** opens profile tiles first. Selecting a profile loads that player's saved picks and theme; **Change profile** returns to the tiles. After submission, each week's matchup shows the names/photos of its pickers and each team's percentage. The denominator is the number of recorded picks for that game, including historical picks from inactive players, excluding players who have no pick for that game. Percentages round to whole numbers and sum to 100% when picks exist; games without picks show 0% on both sides.

## Self-service profiles

File uploads are now available on Profile, Admin → Players, and Admin → Themes once [image upload setup](docs/image-uploads.md) is applied. Player uploads retain the unauthenticated honor system. The URL workflow below also remains available.

The public **Profile** navigation link opens `/profile`, with the same player tiles as Make picks. Select your name, edit the image URL, preview it, and save. Clear the field and save to restore the silhouette.

Apply `supabase/migrations/20260916000001_self_service_profile_photo.sql` before deploying this feature. Its narrow RPC lets family visitors update only the photo URL of an active player; direct table writes remain restricted. This uses the same honor system as picks, so it does not authenticate ownership of a selected name. Administrators retain their photo editor.
