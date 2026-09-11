import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
export default async function AdminHome() {
  const supabase = await requireAdmin();
  const [{ count: playerCount, error: playerError }, { data: currentSeason, error: seasonError }] = await Promise.all([
    supabase.from("entry").select("*", { count:"exact",head:true }).eq("active",true),
    supabase.from("season").select("year").eq("is_current",true).maybeSingle(),
  ]);
  const { data: currentWeek, error: weekError } = currentSeason ? await supabase.from("week").select("week,published").eq("year",currentSeason.year).eq("is_current",true).maybeSingle() : { data:null,error:null };
  if (playerError || seasonError || weekError) return <p role="alert">Unable to load league status. Refresh to retry.</p>;
  return <div className="grid"><section className="card"><h2>Season status</h2><p>{currentSeason?.year ?? "No current season"} · {currentWeek ? "Week " + currentWeek.week : "No current week"}</p><Link className="button secondary" href="/admin/seasons">Manage seasons & weeks</Link></section><section className="card"><h2>Active players</h2><p className="admin-number">{playerCount}</p><Link className="button secondary" href="/admin/players">Manage players</Link></section><section className="card"><h2>Email operations</h2><p>Configure confirmation delivery and review the queue.</p><Link className="button secondary" href="/admin/email">Email settings & status</Link></section></div>;
}
