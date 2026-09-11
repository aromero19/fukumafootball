# Version 1 operations audit — completion update

The URL-based theme image workflow is retained for version 1 per the user's instruction. The stored-file investigation produced no migration or storage changes.

## Gaps addressed

- Login is reachable, admin sessions refresh, protected pages/actions verify the allowlist, and administrators can sign out.
- Standard admin forms now show pending/success/error feedback, preserve input on failure, and clear confirmation checkboxes after success. Failed reads do not become blank editable contact/rule forms.
- Player/contact saves are atomic through a server-only trusted connection with a transactional allowlist recheck and public writes performed under the authenticated role.
- Current-week overview is scoped to the current season. Seasons can be deactivated and weeks unpublished with their markers cleared. Game/correction lists are scoped to season/week. Kickoff requires an explicit offset, can be edited, and games without picks can be removed.
- Corrections offer matchup teams and require a reason plus confirmation. Results/reopening require confirmation for each save. Relevant family and admin pages are revalidated.
- Default-theme changes are atomic. Image URLs can be previewed, replaced and deactivated, with fallback through Default and text.
- Family player reads no longer race; in-flight submission controls are disabled. Input validation, bounded transaction retries, stable request IDs, and best-effort burst limiting are implemented.
- Historical seasons, published weeks, inactive players' saved picks and shared standings ranks are available. Empty/error states avoid fabricated current-week or save claims.
- /admin/email supports sender/reply-to/enable settings, queue health, explicitly confirmed retries and recent audit activity. No page sends email.
- The worker serializes runs, records attempts before sending, limits automatic attempts/age, times out provider requests, hides raw sensitive errors, exits nonzero on failure, and renders only the saved snapshot's picks.

## Remaining release work

See [version-1-release.md](version-1-release.md). Configure the server-only operations connection and worker credential, review/approve deployment, populate actual league data, perform signed-in browser acceptance, and explicitly authorize a provider delivery test and scheduler setup. These hosted/operator steps were not performed automatically.

No applied migration, credential, unrelated working-tree change, or synced project reference was modified.
