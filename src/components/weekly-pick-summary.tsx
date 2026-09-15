import ProfileAvatar from "@/components/profile-avatar";
import TeamImage from "@/components/team-image";
import { readEntries, readPicksPage, readWeeklyPicks } from "@/lib/data";
import { summarizeGamePicks } from "@/lib/pick-summary.mjs";
import { imageCandidates } from "@/lib/theme-images.mjs";

export default async function WeeklyPickSummary({ year, week, entry }: { year: number; week: number; entry: number }) {
  const [data, picks, entries] = await Promise.all([readPicksPage(year, week, entry), readWeeklyPicks(year, week), readEntries()]);
  const names = new Map(data.teams.map(team => [team.team_id, team.team_name]));
  const players = new Map(entries.map(player => [player.entry_id, player]));
  return <section aria-labelledby="weekly-games-title">
    <div className="section-title"><div><div className="eyebrow">{year} · Week {week}</div><h2 id="weekly-games-title">This week’s games & picks</h2></div></div>
    <p className="muted">Percentages use the recorded picks for each game, rounded to whole numbers. Players who haven’t picked that game are excluded.</p>
    <div className="weekly-games">{data.games.map(game => {
      const summary = summarizeGamePicks(game, picks);
      return <article className="card" key={game.game_id}>
        <div className="game-meta"><span>{game.game_date_time ? new Date(game.game_date_time).toLocaleString("en-US", { timeZone: "America/Denver", timeZoneName: "short" }) : "Game time TBD"}</span><span>{game.win_team_id === 34 ? "Open for picks" : game.win_team_id === 33 ? "Final · Tie" : `Winner: ${names.get(game.win_team_id)}`}</span></div>
        <h3 className="matchup-heading">{names.get(game.away_team_id)} at {names.get(game.home_team_id)}</h3>
        <div className="matchup-teams">{summary.sides.map(side => <section className={`team-picks${side.entryIds.includes(entry) ? " your-pick" : ""}`} key={side.teamId}>
          <TeamImage urls={imageCandidates(data.images, side.teamId, data.themeId, data.defaultThemeId)} />
          <h3>{names.get(side.teamId)}</h3><div className="muted">{side.teamId === game.away_team_id ? "Away" : "Home"}{side.entryIds.includes(entry) ? " · Your pick" : ""}</div>
          <div><span className="pick-percentage">{side.percentage}%</span> <span className="muted">· {side.entryIds.length} {side.entryIds.length === 1 ? "pick" : "picks"}</span></div>
          <div className="pick-meter" aria-hidden="true"><span style={{ width: `${side.percentage}%` }} /></div>
          <ul className="pickers">{side.entryIds.map(id => {
            const player = players.get(id);
            const name = player ? `${player.name_first} ${player.name_last}`.trim() : `Player ${id}`;
            return <li key={id}><ProfileAvatar url={player?.photo_url} small /><span>{name}</span></li>;
          })}</ul>
          {!side.entryIds.length && <p className="muted">No picks yet</p>}
        </section>)}</div>
      </article>;
    })}</div>
    {!data.games.length && <p className="card">No games are published for this week.</p>}
  </section>;
}
