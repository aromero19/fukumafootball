/** Count only picks for the two teams in this game; percentages exclude non-pickers. */
export function summarizeGamePicks(game, picks) {
  const sides = [game.away_team_id, game.home_team_id].map(teamId => ({
    teamId,
    entryIds: [...new Set(picks.filter(pick => pick.game_id === game.game_id && pick.team_id === teamId).map(pick => pick.entry_id))],
  }));
  const total = sides.reduce((sum, side) => sum + side.entryIds.length, 0);
  const awayPercent = total ? Math.round(sides[0].entryIds.length / total * 100) : 0;
  return { total, sides: sides.map((side, index) => ({ ...side, percentage: total ? (index === 0 ? awayPercent : 100 - awayPercent) : 0 })) };
}
