# Automatic confirmation delivery on Vercel

This update supersedes the separate-worker-only instructions in the original release guide.

After a successful pick save, Next.js `after()` attempts delivery of that saved request in the background. The browser can finish without waiting for Resend. Confirmed admin retries also trigger delivery. Preview and local deployments do not automatically send. No cron subscription is required for this immediate attempt.

The database receipt, provider idempotency key, global worker lock, skipped-contact behavior, attempt limits and age limits remain in effect. A concurrent worker is given up to 15 seconds to finish. Each background callback handles only its own saved request, not an unrelated backlog. Routes allow 60 seconds. Failed, interrupted or busy attempts remain queued; this is not a durable scheduled retry service. Review Admin Email and use its confirmed retry for attempted messages or the CLI worker for unattempted pending messages. The CLI worker remains usable for backlog recovery.

## Production environment

In the Vercel project, configure these for **Production** and redeploy:

- `RESEND_API_KEY`: the verified domain's Sending access key.
- `FUKUMA_DATABASE_URL`: the Supabase Session pooler URI on port 5432. Use the actual database password, URL encoded. Do not copy a Windows `sslrootcert` path into Vercel.
- `FUKUMA_DATABASE_CA_CERT`: the complete contents of the downloaded Supabase CA certificate, including BEGIN/END lines. Real newlines or literal `\n` separators are supported. The driver verifies the certificate and hostname using this CA.
- Retain the existing public Supabase URL/key. Vercel supplies `VERCEL_ENV=production` automatically.

The CA environment value takes precedence over SSL options in the database URL. Local CLI runs can still use the existing certificate file path. Keep all credentials server-only. The downloaded public CA certificate is not a private key.

In Admin Email retain the verified sender/reply-to and enabled flag. Deployment does not drain an old backlog. After deployment, verify using one authorized submission, check Resend acceptance and the saved receipt, and confirm inbox arrival. A saved response never claims inbox delivery. No hosted environment changes or deployment were performed by this implementation.

For manual recovery with local configuration:

```powershell
node --env-file=.env.local scripts/send-email-outbox.mjs
```
