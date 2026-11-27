// Pick-sheet trends. Same rules as the standings: a tie credits either pick,
// and games without a recorded result are ignored.
export const TIE = 33;
export const OPEN = 34;

const played = (game) => game.win_team_id !== OPEN;

const oldestFirst = (a, b) =>
  a.week - b.week ||
  String(a.game_date_time ?? "").localeCompare(String(b.game_date_time ?? "")) ||
  a.game_id - b.game_id;

/** A team's record, current streak and last five from one season's games. */
export function teamForm(games, teamId) {
  const results = games
    .filter((game) => played(game) && [game.away_team_id, game.home_team_id].includes(teamId))
    .sort(oldestFirst)
    .map((game) => (game.win_team_id === TIE ? "T" : game.win_team_id === teamId ? "W" : "L"));
  const latest = results.at(-1);
  let length = 0;
  while (length < results.length && results.at(-1 - length) === latest) length++;
  const count = (letter) => results.filter((result) => result === letter).length;
  return {
    wins: count("W"),
    losses: count("L"),
    ties: count("T"),
    streak: latest ? { result: latest, length } : null,
    lastFive: results.slice(-5),
  };
}

/** One player's record when picking a team. Each row is a pick with its game. */
export function pickRecord(rows, teamId, year) {
  const scored = rows.filter((row) => row.team_id === teamId && played(row.game));
  const right = (row) => row.game.win_team_id === TIE || row.game.win_team_id === teamId;
  const season = scored.filter((row) => row.game.year === year);
  return {
    right: season.filter(right).length,
    wrong: season.filter((row) => !right(row)).length,
    careerRight: scored.filter(right).length,
    careerPicks: scored.length,
    recent: season
      .sort((a, b) => oldestFirst(b.game, a.game))
      .slice(0, 3)
      .map((row) => {
        const home = row.game.home_team_id === teamId;
        return {
          week: row.game.week,
          opponentId: home ? row.game.away_team_id : row.game.home_team_id,
          home,
          right: right(row),
          tie: row.game.win_team_id === TIE,
        };
      }),
  };
}
