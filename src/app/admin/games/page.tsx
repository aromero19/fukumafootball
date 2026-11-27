import { queryNumber } from "@/lib/data";
import AdminForm from "@/components/admin-form";
import AdminResultChoice from "@/components/admin-result-choice";
import SeasonFilters from "@/components/season-filters";
import { dayLabel, timeLabel } from "@/lib/game-time.mjs";
import { createGame, saveGameResult, saveGameTime, deleteGame } from "../actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminGames({ searchParams }: { searchParams: Promise<{year?:string;week?:string}> }) {
  const supabase = await requireAdmin();
  const q=await searchParams;
  const {data:seasons,error:seasonsError}=await supabase.from("season").select("year,is_current").order("year",{ascending:false});
  const year=queryNumber(q.year,1920,9999) ?? seasons?.find(row=>row.is_current)?.year ?? seasons?.[0]?.year ?? new Date().getFullYear();
  const {data:weeks,error:weeksError}=await supabase.from("week").select("week,is_current").eq("year",year).order("week");
  const week=queryNumber(q.week,1,22) ?? weeks?.find(row=>row.is_current)?.week ?? weeks?.[0]?.week ?? 1;
  const [{ data: teams, error: teamsError }, { data: games, error: gamesError }] = await Promise.all([
    supabase.from("team").select("team_id,team_name").in("team_id", Array.from({ length: 32 }, (_, index) => index + 1)).order("team_id"),
    supabase.from("game").select("game_id,year,week,away_team_id,home_team_id,win_team_id,game_date_time").eq("year",year).eq("week",week).order("game_id"),
  ]);
  if (seasonsError || weeksError || teamsError || gamesError) return <p role="alert">Unable to load administration data. Refresh to retry.</p>;
  const names = new Map((teams ?? []).map((team) => [team.team_id, team.team_name]));
  const entered = (games ?? []).filter(game => game.win_team_id !== 34).length;
  return <div className="form-stack">
    <div className="admin-picker"><SeasonFilters path="/admin/games" seasons={(seasons ?? []).map(row=>row.year)} weeks={(weeks ?? []).map(row=>row.week)} year={year} week={week} /></div>
    <div className="admin-heading"><h2>Results · {year} W{week}</h2>{Boolean(games?.length) && <span className="muted">{entered} of {games?.length} entered</span>}</div>
    {!games?.length && <p className="card">No games for this week yet.</p>}
    <div className="admin-games">{(games ?? []).map((game) => {
      const matchup = `${names.get(game.away_team_id)} at ${names.get(game.home_team_id)}`;
      return <article className="card admin-game" key={game.game_id} aria-label={matchup}>
        <AdminForm action={saveGameResult} className="admin-result">
          <input type="hidden" name="game_id" value={game.game_id} />
          <p className="admin-when">{game.game_date_time ? `${dayLabel(game.game_date_time)} · ${timeLabel(game.game_date_time)}` : "Kickoff to be announced"}</p>
          <AdminResultChoice away={{ id: game.away_team_id, name: names.get(game.away_team_id) ?? "Away" }} home={{ id: game.home_team_id, name: names.get(game.home_team_id) ?? "Home" }} saved={game.win_team_id} />
        </AdminForm>
        <details className="admin-more"><summary>Kickoff or remove</summary><div className="form-stack">
          <AdminForm action={saveGameTime} className="form-stack"><input type="hidden" name="game_id" value={game.game_id} /><label>Kickoff with time zone <input name="game_date_time" defaultValue={game.game_date_time ? new Date(game.game_date_time).toISOString().replace(".000Z","Z") : ""} placeholder="2026-09-13T14:25-06:00" /></label><button className="button secondary">Save kickoff</button></AdminForm>
          <AdminForm action={deleteGame} className="form-stack"><input type="hidden" name="game_id" value={game.game_id} /><label className="check-label"><input type="checkbox" name="confirm_delete" required /> Remove this game if no picks exist</label><button className="button secondary is-danger">Remove game</button></AdminForm>
        </div></details>
      </article>;
    })}</div>
    <details className="card admin-panel" open={!games?.length}><summary>Add a game</summary><AdminForm key={`${year}-${week}`} action={createGame} resetOnSuccess className="compact-form"><label>Season <input required name="year" type="number" defaultValue={year} /></label><label>Week <input required name="week" type="number" defaultValue={week} min="1" max="22" /></label><label>Away <select name="away_team_id">{(teams ?? []).map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}</select></label><label>Home <select name="home_team_id">{(teams ?? []).map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}</select></label><label>Kickoff with time zone <input name="game_date_time" placeholder="2026-09-13T14:25-06:00" /></label><button className="button">Add game</button></AdminForm></details>
  </div>;
}
