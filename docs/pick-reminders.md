# Weekly pick reminders

Apply `supabase/migrations/20260924000001_pick_reminders.sql` before deploying. Existing profiles are opted out. The Entry Profile form follows the existing family honor system; it exposes only whether a private contact exists, never the email address. An administrator must add a contact before a player can opt in.

The default is Wednesday at 18:00 America/Denver. Players can choose their weekday, local time and IANA time zone (including daylight saving adjustments). For each current, published week in the current active season, the schedule is the selected weekday/time immediately before the earliest kickoff. If that weekday/time would be at or after kickoff, it belongs to the previous calendar week. A delayed invocation can catch up only before kickoff. Missing kickoff times, recorded results, inactive players, missing contacts, opt-outs and existing weekly submissions all suppress delivery.

## Production setup

Use the existing Resend and database configuration from [vercel-email.md](vercel-email.md), with email enabled in Admin Email. Add these server-only production environment variables:

- `CRON_SECRET`: a randomly generated secret of at least 32 characters.
- `FUKUMA_SITE_URL`: the public HTTPS origin of this site, used for picks and profile links.

This project's Vercel Hobby plan cannot run subdaily cron jobs. Supabase `pg_cron` and `pg_net` invoke `/api/cron/pick-reminders` every five minutes instead. The shared secret and site origin are stored in Supabase Vault; the cron command contains neither value. The secret grants access only to triggering eligible reminders, not to either hosting account or the database. See [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions).

After importing `CRON_SECRET` and `FUKUMA_SITE_URL` into the Vercel Production environment, use the operator utility with the same configuration in an ignored `.env.reminder-deploy` file:

```powershell
node --env-file=.env.local --env-file=.env.reminder-deploy scripts/setup-pick-reminder-scheduler.mjs prepare
# Deploy the app, then verify the endpoint and enable the prepared job:
node --env-file=.env.local --env-file=.env.reminder-deploy scripts/setup-pick-reminder-scheduler.mjs enable
node --env-file=.env.local scripts/setup-pick-reminder-scheduler.mjs status
```

`prepare` installs the scheduler extensions, stores the shared configuration in Vault, and creates a paused job. `enable` verifies authenticated production delivery before activating the recurring job. Never configure both Supabase and Vercel cron triggers. Never commit deployment environment files. The utility deliberately prints no secret values.

Local and preview requests never send reminders. Deploying code alone does not configure production secrets or apply the database migration. Verify the scheduler is registered and inspect an authorized opt-in delivery before announcing the deployed feature.

## Delivery and operations

One private receipt per entry/season/week prevents repeat reminders. A global advisory lock coordinates reminders, confirmations, contact changes and opt-outs. The worker rechecks eligibility immediately before sending and locks submission-related records during delivery. Provider retries use the same saved message and idempotency key, with at most five attempts within 23 hours of the first attempt. Old uncertain attempts require operator review, never automatic reset. A contact change suppresses retries to the old address. Up to 100 candidates are considered per invocation, with a 40-second work budget; additional work is handled on subsequent invocations. Provider calls have a 15-second timeout.

Monitor scheduler responses (`sent`, `failed`, `busy`, `disabled`), `cron.job_run_details`, `net._http_response` and the private `pick_reminder_delivery` table (`attempts`, `sent_at`, `last_error`). A successful cron SQL run only queues an HTTP request; verify its HTTP status as well. These receipts are separate from confirmation receipts in Admin Email. Provider acceptance does not guarantee inbox delivery. No real messages are sent by the tests.
