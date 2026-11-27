"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { TeamTrend } from "@/lib/trends-data";
import { teamColors } from "@/lib/team-colors.mjs";

type Side = { id: number; name: string };

const words = { W: "Won", L: "Lost", T: "Tied" } as const;
const tone = (result: string) =>
  result === "W" ? "is-right" : result === "L" ? "is-wrong" : "is-tie";
const percent = (part: number, whole: number) => Math.round((100 * part) / whole);

export default function GameTrends({
  id,
  hidden,
  year,
  entryId,
  sides,
  names,
}: {
  id: string;
  hidden: boolean;
  year: number;
  entryId: number;
  sides: [Side, Side];
  names: Record<number, string>;
}) {
  const [teams, setTeams] = useState<TeamTrend[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const url = `/api/trends?year=${year}&entry=${entryId}&away=${sides[0].id}&home=${sides[1].id}`;

  // Load only when a panel is first opened, so the pick sheet stays quick.
  useEffect(() => {
    if (hidden || teams) return;
    let current = true;
    fetch(url, { signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error();
        if (current) setTeams(body.teams);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [hidden, teams, url, attempt]);

  const row = (key: string, content: (team: TeamTrend) => ReactNode) => (
    <div className="trend-row" key={key}>
      {teams?.map((team) => (
        <div className="trend-cell" key={team.teamId}>
          {content(team)}
        </div>
      ))}
    </div>
  );
  const none = (note: string) => (
    <>
      <span className="trend-big">—</span>
      <span className="trend-note">{note}</span>
    </>
  );

  return (
    <div className="trends" id={id} hidden={hidden}>
      <div className="trend-row">
        {sides.map((side) => (
          <strong
            className="trend-team"
            key={side.id}
            style={{ "--team-bg": teamColors(side.id).bg } as CSSProperties}
          >
            {side.name}
          </strong>
        ))}
      </div>

      {!teams && !failed && (
        <p className="trend-status" role="status">
          Loading trends…
        </p>
      )}
      {!teams && failed && (
        <p className="trend-status" role="status">
          Trends could not be loaded.{" "}
          <button
            type="button"
            className="trend-retry"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </p>
      )}

      {teams && (
        <>
          <h3 className="trend-heading">Your picks in {year}</h3>
          {row("mine", ({ mine }) => (
            <>
              {mine.right + mine.wrong ? (
                <>
                  <span className="trend-big">
                    {mine.right}–{mine.wrong}
                  </span>
                  <span className="trend-note">right–wrong when you picked them</span>
                </>
              ) : (
                none(mine.careerPicks ? "Not picked this season" : "You’ve never picked them")
              )}
              {mine.careerPicks > 0 && (
                <span className="trend-career">
                  All seasons: {mine.careerRight} of {mine.careerPicks} (
                  {percent(mine.careerRight, mine.careerPicks)}%)
                </span>
              )}
            </>
          ))}
          {row("recent", ({ mine }) => (
            <ul className="trend-picks">
              {mine.recent.map((pick) => (
                <li key={pick.week} className={pick.right ? "is-right" : "is-wrong"}>
                  <span aria-hidden="true">{pick.right ? "✓" : "✗"}</span>
                  <span>
                    Wk {pick.week} {pick.home ? "vs" : "at"} {names[pick.opponentId]}
                    {pick.tie && " (tie)"}
                    <span className="sr-only">: {pick.right ? "right" : "wrong"}</span>
                  </span>
                </li>
              ))}
            </ul>
          ))}

          <h3 className="trend-heading">Team form</h3>
          {row("record", ({ form }) =>
            form.streak ? (
              <>
                <span className="trend-big">
                  {form.wins}–{form.losses}
                  {form.ties > 0 && `–${form.ties}`}
                </span>
                <span className={`trend-streak ${tone(form.streak.result)}`}>
                  {words[form.streak.result]}{" "}
                  {form.streak.length > 1 ? `${form.streak.length} straight` : "last game"}
                </span>
              </>
            ) : (
              none("No results yet this season")
            ),
          )}
          {row("form", ({ form }) =>
            form.lastFive.length ? (
              <>
                <span className="trend-form">
                  {form.lastFive.map((result, index) => (
                    <span key={index} className={tone(result)}>
                      {result}
                    </span>
                  ))}
                </span>
                <span className="trend-note">
                  Last {form.lastFive.length}, newest on the right
                </span>
              </>
            ) : null,
          )}

          <h3 className="trend-heading">Whole league’s picks</h3>
          {row("league", ({ league }) => {
            const scored = league.right + league.wrong;
            return (
              <>
                {scored ? (
                  <>
                    <span className="trend-big">
                      {league.right}–{league.wrong}
                    </span>
                    <span className="trend-note">right–wrong in {year}</span>
                    <span className="trend-meter" aria-hidden="true">
                      <span style={{ width: `${percent(league.right, scored)}%` }} />
                    </span>
                    <span className="trend-career">{percent(league.right, scored)}% right</span>
                  </>
                ) : (
                  none("No scored picks this season")
                )}
                {league.careerPicks > 0 && (
                  <span className="trend-note">
                    All seasons: {percent(league.careerRight, league.careerPicks)}% of{" "}
                    {league.careerPicks} picks
                  </span>
                )}
              </>
            );
          })}
          <p className="trend-note trend-foot">
            From results recorded on this site. Ties count as right. Some older weeks are missing.
          </p>
        </>
      )}
    </div>
  );
}
