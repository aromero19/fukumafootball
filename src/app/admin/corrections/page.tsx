import { queryNumber } from "@/lib/data";
import CorrectionForm from "@/components/admin-correction-form";
import { requireAdmin } from "@/lib/admin";

export default async function AdminCorrections({ searchParams }: { searchParams: Promise<{year?:string;week?:string}> }) {
  const supabase = await requireAdmin();
  const q=await searchParams;
  const {data:seasons,error:seasonsError}=await supabase.from("season").select("year,is_current").order("year",{ascending:false});
  const year=queryNumber(q.year,1920,9999) ?? seasons?.find(row=>row.is_current)?.year ?? seasons?.[0]?.year ?? new Date().getFullYear();
  const {data:weeks,error:weeksError}=await supabase.from("week").select("week,is_current").eq("year",year).order("week");
  const week=queryNumber(q.week,1,22) ?? weeks?.find(row=>row.is_current)?.week ?? weeks?.[0]?.week ?? 1;
  const [{ data: players, error: playersError }, { data: games, error: gamesError }, { data: teams, error: teamsError }] = await Promise.all([
    supabase.from("entry").select("entry_id,name_first,name_last").order("name_first").order("name_last"),
    supabase.from("game").select("game_id,year,week,away_team_id,home_team_id").eq("year",year).eq("week",week).order("game_id"),
    supabase.from("team").select("team_id,team_name").order("team_id"),
  ]);
  if (seasonsError || weeksError || teamsError || gamesError || playersError) return <p role="alert">Unable to load administration data. Refresh to retry.</p>;
  const names = Object.fromEntries((teams ?? []).map((team) => [team.team_id, team.team_name]));
  return <section className="card"><h2>Audited pick correction</h2><form method="get" className="toolbar"><label>Season <select name="year" defaultValue={year}>{(seasons ?? []).map(row=><option key={row.year} value={row.year}>{row.year}</option>)}</select></label><label>Week <select name="week" defaultValue={week}>{(weeks ?? []).map(row=><option key={row.week} value={row.week}>{row.week}</option>)}</select></label><button className="button secondary">View week</button></form><p className="muted">Use only for verified corrections. The original and replacement pick are audited with your reason.</p><CorrectionForm key={year+"-"+week} players={players ?? []} games={games ?? []} names={names} /></section>;
}
