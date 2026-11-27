import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
export default async function AdminHome() {
  const supabase = await requireAdmin();
  const [{ count: playerCount, error: playerError }, { count: paidCount, error: paidError }, { data: currentSeason, error: seasonError }] = await Promise.all([
    supabase.from("entry").select("*", { count:"exact",head:true }).eq("active",true),
    supabase.from("entry").select("*", { count:"exact",head:true }).eq("active",true).eq("playing_for_money",true),
    supabase.from("season").select("year").eq("is_current",true).maybeSingle(),
  ]);
  const { data: currentWeek, error: weekError } = currentSeason ? await supabase.from("week").select("week,published").eq("year",currentSeason.year).eq("is_current",true).maybeSingle() : { data:null,error:null };
  const { data: games, error: gamesError } = currentSeason && currentWeek ? await supabase.from("game").select("win_team_id").eq("year",currentSeason.year).eq("week",currentWeek.week) : { data:null,error:null };
  if (playerError || paidError || seasonError || weekError || gamesError) return <p role="alert">Unable to load league status. Refresh to retry.</p>;
  const total = games?.length ?? 0;
  const entered = games?.filter(game => game.win_team_id !== 34).length ?? 0;
  return <div className="form-stack">
    <section className="card admin-week">
      <h2>{currentSeason?.year ?? "No current season"} · {currentWeek ? "Week " + currentWeek.week : "No current week"}</h2>
      {currentWeek && <>
        <p>{total ? `${entered} of ${total} results entered` : "No games added yet"}</p>
        <progress max={total || 1} value={entered} aria-label="Results entered" />
      </>}
      <Link className="button" href="/admin/games">{total ? "Enter results" : "Manage games"}</Link>
      <Link className="button secondary" href="/admin/seasons">Change the current week</Link>
    </section>
    <div className="admin-stats">
      <Link href="/admin/players" className="card"><strong>{playerCount}</strong><span>Active players</span></Link>
      <Link href="/admin/players" className="card"><strong>{paidCount}</strong><span>Playing for money</span></Link>
    </div>
  </div>;
}
