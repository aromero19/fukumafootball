# Image uploads

## Activation

1. Apply `supabase/migrations/20260917000001_image_uploads.sql` through the approved hosted migration workflow, after all earlier migrations. It creates two public image buckets and a private upload-attempt table. Do not add anonymous or authenticated Storage write policies to these buckets.
2. Set **SUPABASE_SECRET_KEY** to a Supabase server secret key (or legacy service-role key) for this same project in the server environment and Vercel Production. Never prefix it with `NEXT_PUBLIC_`, put it in source control, or expose it to a browser. The existing `FUKUMA_DATABASE_URL` and TLS configuration are also required; its trusted operator role must be able to access the new private table and write image URL fields.
3. Deploy the application. No hosted migration, credential configuration, or deployment is performed by the local implementation.
4. Smoke-test a player upload without login, admin theme upload, replacement, removal via the URL field, and a rejected theme upload without admin authentication. Verify that browser requests cannot write directly to either bucket. Verify only the intended URL fields changed.

## Use

- **Profile:** select a name, choose a photo, inspect the square preview, then select **Upload and save image**. No player login is required; any visitor can choose any active player, as before.
- **Admin → Players:** administrators can also upload photos for inactive players.
- **Admin → Themes:** select a theme and team, inspect the preview, then upload and save. Upload replaces the image, clears any old thumbnail URL, and uses the current Active image selection.
- Existing HTTPS URL fields remain available. Upload saves immediately; the separate URL save button is only needed for manual URL edits. Clearing a profile URL restores the silhouette.
- Preparation and saving have separate progress labels. Image decoding and preview encoding each time out after 15 seconds; the save request times out after 65 seconds and releases the controls. If a save times out, refresh and check the photo before retrying because the server may already have saved it.
- Server Storage requests time out after 15 seconds. Removal of a replaced image runs after the success response so cleanup cannot keep a saved photo waiting on screen.

## Storage and limits

| Bucket | Path | Result |
| --- | --- | --- |
| player-photos | players/{entry_id}/{uuid}.webp | 512 × 512 centered square |
| team-themes | themes/{theme_id}/teams/{team_id}/{uuid}.webp | Fits within 1600 × 1600, preserving proportions |

Selected files: JPEG, PNG, or WebP, up to 2 MiB for photos or 5 MiB for themes and 25 megapixels. The browser prepares a preview and compresses the image to at most 2 MiB. The server streams with an independent 2 MiB bound, decodes, checks the format and dimensions, strips metadata, and re-encodes to WebP. Buckets accept only WebP up to 2 MiB. This keeps requests below Vercel's 4.5 MB function payload limit.

The server holds the Storage credential and chooses paths; browsers have no direct storage write access. Public buckets make images accessible to anyone with the URL. Same-origin checks reduce cross-site submissions but do not authenticate players.

Database-backed quotas allow five photo upload attempts per player per ten minutes and sixty photo attempts per hour across the app. Admin theme quotas are twenty attempts per team/theme per ten minutes and three hundred per hour. Failed image validation or Storage requests consume an attempt. Expired quota rows are removed on the next upload. A shared transaction lock makes reservations atomic across instances; no IP address is stored.

File and database writes cannot share one transaction. The endpoint saves a new immutable object, updates the database, and then attempts to delete the previous object only when it belongs to this destination and has no remaining URL references. It removes new objects on known pre-commit failures; it retains them on uncertain commits. Abrupt termination, cleanup failure, clearing a URL, or replacing it through the manual URL editor can leave unreferenced files. Periodically review these in Storage; never delete files still referenced by `entry.photo_url`, `team_theme_image.image_url`, or `thumbnail_url`.

## Validation

Run `npm.cmd run test:images`, `npm.cmd run test:app`, `npm.cmd run test:db`, `npm.cmd run test:email-worker`, `npm.cmd run lint`, and `npm.cmd run build`.

Run `npm.cmd run test:db:integration` with Docker Desktop available before release. The embedded tests emulate Storage bucket metadata; they do not test the Supabase Storage service or real concurrent advisory locking. Hosted Storage smoke tests are also required after configuration.
