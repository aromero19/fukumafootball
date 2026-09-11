import { redirect } from "next/navigation";
import Link from "next/link";
import { queryNumber } from "@/lib/data";

export const metadata = { title: "Picks submitted | Fukuma Football" };

export default async function PicksSuccess({ searchParams }: {
  searchParams: Promise<{ year?: string; week?: string; entry?: string; email?: string }>;
}) {
  const query = await searchParams;
  const year = queryNumber(query.year, 1920, 9999);
  const week = queryNumber(query.week, 1, 22);
  const entry = queryNumber(query.entry, 1, Number.MAX_SAFE_INTEGER);
  if (!year || !week || !entry) redirect("/picks");

  const editQuery = new URLSearchParams({ year: String(year), week: String(week), entry: String(entry) });

  return <section className="card narrow-card">
    <div className="eyebrow">{year} season · Week {week}</div>
    <h1>Picks submitted successfully!</h1>
    <p>Your picks have been saved. You’re all set for this week.</p>
    {query.email === "queued" && <p className="muted">Your confirmation email is queued; it has not been sent yet.</p>}
    {query.email === "none" && <p className="muted">No confirmation email was queued.</p>}
    <p>You can go back and edit your picks while games are still open.</p>
    <div className="toolbar">
      {/* Reload saved picks instead of restoring a cached form. */}
      <a className="button" href={`/picks?${editQuery}`}>Back to edit picks</a>
      <Link className="button secondary" href="/">Back to home</Link>
    </div>
  </section>;
}
