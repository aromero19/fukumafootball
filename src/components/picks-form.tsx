"use client";

import { submitPicks } from "@/app/picks/actions";
import { useRouter } from "next/navigation";
import TeamImage from "@/components/team-image";
import { imageCandidates } from "@/lib/theme-images.mjs";
import { Fragment, useMemo, useRef, useState, type CSSProperties } from "react";
import { hasEveryOpenPick, submissionPicks } from "@/lib/picks.mjs";
import { groupByDay, hasStarted, timeLabel } from "@/lib/game-time.mjs";
import { teamColors } from "@/lib/team-colors.mjs";

type Game = {
  game_id: number;
  away_team_id: number;
  home_team_id: number;
  win_team_id: number;
  game_date_time: string | null;
};
type Team = { team_id: number; team_name: string };
type Theme = { theme_id: number; theme_name: string };
type Pick = { game_id: number; team_id: number };
type Props = {
  seasonActive: boolean;
  images: {
    team_id: number;
    theme_id: number;
    image_url: string;
    thumbnail_url: string | null;
    active: boolean;
  }[];
  defaultThemeId: number | null;
  year: number;
  week: number;
  games: Game[];
  teams: Team[];
  themes: Theme[];
  picks: Pick[];
  themeId: number | null;
  initialEntryId: number;
};

export default function PicksForm({
  seasonActive,
  images,
  defaultThemeId,
  year,
  week,
  games,
  teams,
  themes,
  picks,
  themeId,
  initialEntryId,
}: Props) {
  const router = useRouter();
  const busy = useRef(false);
  const entry = initialEntryId;
  const [theme, setTheme] = useState<number | "">(
    themes.some((item) => item.theme_id === themeId)
      ? (themeId ?? "")
      : (defaultThemeId ?? themes[0]?.theme_id ?? ""),
  );
  const [selected, setSelected] = useState<Record<number, number>>(
    Object.fromEntries(picks.map((pick) => [pick.game_id, pick.team_id])),
  );
  const [requestId, setRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const names = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.team_id, team.team_name])),
    [teams],
  );
  const openGames = games.filter((game) => game.win_team_id === 34);
  const completed = openGames.filter(
    (game) =>
      selected[game.game_id] === game.home_team_id || selected[game.game_id] === game.away_team_id,
  ).length;

  function choosePick(game: Game, teamId: number) {
    if (game.win_team_id !== 34 || busy.current || !seasonActive) return;
    setSelected((current) => ({ ...current, [game.game_id]: teamId }));
    setRequestId(null);
    setMessage("");
  }

  async function submit() {
    if (busy.current || !seasonActive || !games.length) return;
    if (!entry || !theme) return setMessage("Choose a theme first.");
    if (!hasEveryOpenPick(games, selected))
      return setMessage("Please choose a team for every open game.");
    busy.current = true;
    setSubmitting(true);
    setMessage("");
    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    const payload = {
      p_entry_id: entry,
      p_year: year,
      p_week: week,
      p_theme_id: theme,
      p_request_id: id,
      p_picks: submissionPicks(selected),
    };
    try {
      const { data, error } = await submitPicks(payload);
      if (error) {
        setMessage(
          "Picks were not confirmed: " +
            error.message +
            " Retry without changing your choices, or refresh to see updated game results.",
        );
        return;
      }
      const query = new URLSearchParams({
        year: String(year),
        week: String(week),
        entry: String(entry),
        email: data?.email_status === "queued" ? "queued" : "none",
      });
      router.push(`/picks/success?${query}`);
    } catch {
      setMessage(
        "Connection interrupted. Your picks may already be saved. Retry without changing your choices to safely confirm them.",
      );
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="pick-sheet">
      {!seasonActive && (
        <p className="status">
          This season is closed for submissions. Saved picks remain available in Results.
        </p>
      )}
      {!games.length && <p>No games are published for this week yet.</p>}
      {!themes.length && <p>No active themes are available. Contact the administrator.</p>}
      {message && (
        <div className="status" role="status">
          {message}
        </div>
      )}
      {(groupByDay(games) as { label: string; games: Game[] }[]).map((day) => (
        <section className="pick-day" key={day.label}>
          <h2 className="day-heading">{day.label}</h2>
          <div className="pick-day-games">
            {day.games.map((game) => {
              const locked = game.win_team_id !== 34;
              const started = !locked && hasStarted(game.game_date_time);
              return (
                <div className="pick-game" key={game.game_id}>
                  <div className="pick-meta">
                    <span>{timeLabel(game.game_date_time)}</span>
                    {locked && (
                      <span className="pick-badge is-final">
                        {game.win_team_id === 33
                          ? "Tie · locked"
                          : `Winner: ${names[game.win_team_id]} · locked`}
                      </span>
                    )}
                    {/* Server and phone clocks can differ right at kickoff. */}
                    {started && (
                      <span className="pick-badge" suppressHydrationWarning>
                        Started
                      </span>
                    )}
                  </div>
                  <div className="pick-pair">
                    {[game.away_team_id, game.home_team_id].map((teamId, side) => {
                      const chosen = selected[game.game_id] === teamId;
                      const colors = teamColors(teamId);
                      return (
                        <Fragment key={teamId}>
                          {side === 1 && (
                            <span className="pick-at" aria-hidden="true">
                              @
                            </span>
                          )}
                          <button
                            type="button"
                            className={`pick-tile${chosen ? " is-chosen" : ""}${game.win_team_id === teamId ? " is-winner" : ""}`}
                            style={
                              {
                                "--team-bg": colors.bg,
                                "--team-text": colors.text,
                              } as CSSProperties
                            }
                            aria-pressed={chosen}
                            aria-label={`${names[teamId]}, ${side === 0 ? "away" : "home"} team`}
                            disabled={locked || !entry || submitting || !seasonActive}
                            onClick={() => choosePick(game, teamId)}
                          >
                            <span className="pick-disc">
                              <TeamImage
                                key={String(theme) + "-" + teamId}
                                urls={imageCandidates(images, teamId, theme, defaultThemeId)}
                              />
                            </span>
                            <span className="pick-name">{names[teamId]}</span>
                            {chosen && (
                              <span className="pick-mark" aria-hidden="true">
                                ✓
                              </span>
                            )}
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className="toolbar pick-sheet-toolbar">
        <label>
          Theme{" "}
          <select
            value={theme}
            onChange={(event) => {
              setTheme(Number(event.target.value));
              setRequestId(null);
            }}
            disabled={!entry || submitting || !seasonActive}
          >
            {themes.map((item) => (
              <option key={item.theme_id} value={item.theme_id}>
                {item.theme_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="pick-submit-bar">
        <div>
          <strong aria-live="polite">
            {completed} of {openGames.length} open games selected
          </strong>
          <span className="muted">
            {!seasonActive
              ? "Season closed"
              : !openGames.length
                ? "No open games to pick"
                : completed === openGames.length
                  ? "Ready to submit your picks"
                  : `${openGames.length - completed} more to choose`}
          </span>
          <progress
            value={completed}
            max={openGames.length || 1}
            aria-label="Open game selection progress"
          />
        </div>
        <button
          className="button"
          disabled={submitting || !entry || !theme || !seasonActive || !games.length}
          onClick={submit}
        >
          {submitting ? "Saving…" : "Submit picks →"}
        </button>
      </div>
    </div>
  );
}
