import ProfileAvatar from "@/components/profile-avatar";
import TeamImage from "@/components/team-image";
import { readEntries, readPicksPage, readWeeklyPicks } from "@/lib/data";
import { summarizeGamePicks } from "@/lib/pick-summary.mjs";
import { imageCandidates } from "@/lib/theme-images.mjs";
import { teamColors } from "@/lib/team-colors.mjs";
import { dayLabel, timeLabel } from "@/lib/game-time.mjs";

type Props = {
  data: Awaited<ReturnType<typeof readPicksPage>>;
  picks: Awaited<ReturnType<typeof readWeeklyPicks>>;
  entries: Awaited<ReturnType<typeof readEntries>>;
  entry?: number;
  me?: number;
  compact?: boolean;
};

export default function GamePickCards({ data, picks, entries, entry, me, compact = false }: Props) {
  const names = new Map(data.teams.map((team) => [team.team_id, team.team_name]));
  const players = new Map(entries.map((player) => [player.entry_id, player]));
  return (
    <div className={compact ? "results-games" : "weekly-games"}>
      {data.games.map((game) => {
        const summary = summarizeGamePicks(game, picks);
        return (
          <article className="card family-game" key={game.game_id}>
            <div className="game-meta">
              <span>
                {game.game_date_time
                  ? `${dayLabel(game.game_date_time)} · ${timeLabel(game.game_date_time)}`
                  : "Kickoff time unavailable"}
              </span>
              <strong className={game.win_team_id === 34 ? "" : "winner-label"}>
                {game.win_team_id === 34
                  ? "Awaiting result"
                  : game.win_team_id === 33
                    ? "Final · Tie"
                    : `✓ ${names.get(game.win_team_id)} win`}
              </strong>
            </div>
            <h3 className="matchup-heading">
              {names.get(game.away_team_id)} at {names.get(game.home_team_id)}
            </h3>
            <div className="matchup-teams">
              {summary.sides.map((side) => {
                const yours = entry !== undefined && side.entryIds.includes(entry);
                const winner = side.teamId === game.win_team_id;
                const orderedIds = [...side.entryIds].sort(
                  (a, b) => Number(b === entry) - Number(a === entry),
                );
                const teamColor = teamColors(side.teamId);
                return (
                  <section
                    className={`team-picks${yours ? " your-pick" : ""}${winner ? " winning-team" : ""}`}
                    key={side.teamId}
                    style={
                      {
                        "--team-bg": teamColor.bg,
                        "--team-text": teamColor.text,
                      } as React.CSSProperties
                    }
                  >
                    <div className="team-pick-heading">
                      <TeamImage
                        urls={imageCandidates(
                          data.images,
                          side.teamId,
                          data.themeId,
                          data.defaultThemeId,
                        )}
                      />
                      <div>
                        <h3>{names.get(side.teamId)}</h3>
                        <div className="team-side-label">
                          {side.teamId === game.away_team_id ? "Away" : "Home"}
                          {winner && <span className="winner-label"> · ✓ Winner</span>}
                        </div>
                      </div>
                    </div>
                    {yours && <div className="your-pick-label">✓ Your pick</div>}
                    <div className="pick-count">
                      <span className="pick-percentage">{side.percentage}%</span>{" "}
                      <span className="muted">
                        · {side.entryIds.length} {side.entryIds.length === 1 ? "pick" : "picks"}
                      </span>
                    </div>
                    <div className="pick-meter" aria-hidden="true">
                      <span
                        style={{
                          width: `${side.percentage}%`,
                          backgroundColor: teamColor.bg,
                        }}
                      />
                    </div>
                    <ul className="pickers">
                      {orderedIds.map((id) => {
                        const player = players.get(id);
                        const name = player
                          ? `${player.name_first} ${player.name_last}`.trim()
                          : `Player ${id}`;
                        return (
                          <li
                            key={id}
                            title={
                              name +
                              (id === entry ? (id === me ? " · You" : " · Selected player") : "")
                            }
                            aria-label={
                              name +
                              (id === entry ? (id === me ? " · You" : " · Selected player") : "")
                            }
                            className={id === entry ? "selected-picker" : undefined}
                          >
                            <ProfileAvatar url={player?.photo_url} small />
                            <span>
                              {compact ? (player?.name_first ?? name) : name}
                              {id === entry && (
                                <small>
                                  {id === me ? "You" : compact ? "Selected" : "Selected player"}
                                </small>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {!side.entryIds.length && <p className="muted no-picks">No recorded picks</p>}
                  </section>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
