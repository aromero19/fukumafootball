import { createClient } from "@/lib/supabase/server";
import { OPEN, TIE, pickRecord, teamForm } from "@/lib/trends.mjs";

type Game = {
  game_id: number;
  year: number;
  week: number;
  away_team_id: number;
  home_team_id: number;
  win_team_id: number;
  game_date_time: string | null;
};
type PickRow = { team_id: number; game: Game };
type Result = "W" | "L" | "T";
type RecentPick = { week: number; opponentId: number; home: boolean; right: boolean; tie: boolean };
export type TeamTrend = {
  teamId: number;
  mine: { right: number; wrong: number; careerRight: number; careerPicks: number; recent: RecentPick[] };
  form: { wins: number; losses: number; ties: number; streak: { result: Result; length: number } | null; lastFive: Result[] };
  league: { right: number; wrong: number; careerRight: number; careerPicks: number };
};

const gameColumns = "game_id,year,week,away_team_id,home_team_id,win_team_id,game_date_time";
const unavailable = () => new Error("Trends could not be loaded.");

/** Trends for the two teams in one matchup, from published picks and recorded results. */
export async function readTrends(
  year: number,
  entryId: number,
  teamIds: number[],
): Promise<TeamTrend[]> {
  const s = await createClient();

  async function seasonGames(teamId: number) {
    const { data, error } = await s
      .from("game")
      .select(gameColumns)
      .eq("year", year)
      .neq("win_team_id", OPEN)
      .or(`away_team_id.eq.${teamId},home_team_id.eq.${teamId}`);
    if (error) throw unavailable();
    return data as Game[];
  }

  async function myPicks(teamId: number) {
    const rows: PickRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await s
        .from("pick")
        .select(`team_id,game!inner(${gameColumns})`)
        .eq("entry_id", entryId)
        .eq("team_id", teamId)
        .neq("game.win_team_id", OPEN)
        .order("pick_id")
        .range(offset, offset + 999);
      if (error) throw unavailable();
      rows.push(...(data as unknown as PickRow[]));
      if (data.length < 1000) return rows;
    }
  }

  // Counted by the database, so the league's full history is never downloaded.
  async function leagueCount(teamId: number, right: boolean, season?: number) {
    let query = s
      .from("pick")
      .select("pick_id,game!inner(year,win_team_id)", { count: "exact", head: true })
      .eq("team_id", teamId);
    query = right
      ? query.in("game.win_team_id", [teamId, TIE])
      : query.not("game.win_team_id", "in", `(${teamId},${TIE},${OPEN})`);
    if (season) query = query.eq("game.year", season);
    const { count, error } = await query;
    if (error || count === null) throw unavailable();
    return count;
  }

  return Promise.all(
    teamIds.map(async (teamId) => {
      const [games, rows, right, wrong, careerRight, careerWrong] = await Promise.all([
        seasonGames(teamId),
        myPicks(teamId),
        leagueCount(teamId, true, year),
        leagueCount(teamId, false, year),
        leagueCount(teamId, true),
        leagueCount(teamId, false),
      ]);
      return {
        teamId,
        mine: pickRecord(rows, teamId, year) as TeamTrend["mine"],
        form: teamForm(games, teamId) as TeamTrend["form"],
        league: { right, wrong, careerRight, careerPicks: careerRight + careerWrong },
      };
    }),
  );
}
