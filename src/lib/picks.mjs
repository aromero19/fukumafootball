export function openGameIds(games) {
  return games.filter((game) => game.win_team_id === 34).map((game) => game.game_id);
}

export function hasEveryOpenPick(games, selected) {
  return openGameIds(games).every((gameId) => Number.isInteger(selected[gameId]));
}

export function submissionPicks(selected) {
  return Object.entries(selected)
    .map(([gameId, teamId]) => ({ game_id: Number(gameId), team_id: Number(teamId) }))
    .sort((left, right) => left.game_id - right.game_id);
}


export async function submitWithRetry(send, payload, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await send(payload);
    if (!result.error || !["40P01", "40001"].includes(result.error.code) || attempt === 2) return result;
    await pause(150 * 2 ** attempt);
  }
}
