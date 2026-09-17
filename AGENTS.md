<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Home page feature announcements

When adding or materially improving a user-facing feature, update `src/lib/feature-updates.ts` in the same change. Keep 3–5 recent highlights, newest first, with short family-friendly descriptions and links to the relevant pages. Replace older highlights as new ones ship. Announce only available functionality and state any important limits, especially incomplete historical records. The home page displays at most five entries.
