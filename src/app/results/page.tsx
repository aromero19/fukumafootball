import GamePickCards from "@/components/game-pick-cards";
import {
  readLeague,
  readPicksPage,
  readEntries,
  readWeeks,
  readPublishedSeasons,
  queryNumber,
  readLatestResultsWeek,
  readWeeklyPicks,
} from "@/lib/data";
import ResultsFilters from "@/components/results-filters";
import { rememberedPlayer } from "@/lib/remembered-player";

export default async function Results({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string; entry?: string }>;
}) {
  const league = await readLeague(),
    q = await searchParams,
    seasons = await readPublishedSeasons();
  const year =
    queryNumber(q.year, 1920, 9999) ??
    (league.hasCurrentSeason ? league.year : (seasons[0] ?? league.year));
  const [weeks, entries] = await Promise.all([readWeeks(year), readEntries()]);
  const requestedWeek = queryNumber(q.week, 1, 22);
  const latestResultsWeek = requestedWeek
    ? undefined
    : await readLatestResultsWeek(
        year,
        weeks.map((row) => row.week),
      );
  const week =
    requestedWeek ??
    latestResultsWeek ??
    weeks.find((row) => row.is_current)?.week ??
    weeks.at(-1)?.week;
  const entry = queryNumber(q.entry, 1, Number.MAX_SAFE_INTEGER);
  const [d, allPicks] = week
    ? await Promise.all([readPicksPage(year, week, entry), readWeeklyPicks(year, week)])
    : [null, []];
  const picked = Object.fromEntries((d?.picks ?? []).map((row) => [row.game_id, row.team_id]));
  const outcome = (game: NonNullable<typeof d>["games"][number]) =>
    !picked[game.game_id]
      ? "missing"
      : game.win_team_id === 34
        ? "pending"
        : game.win_team_id === 33 || game.win_team_id === picked[game.game_id]
          ? "correct"
          : "incorrect";
  const labels = {
    correct: "Correct",
    incorrect: "Incorrect",
    pending: "Awaiting result",
    missing: "No pick recorded",
  };
  const me = await rememberedPlayer();
  return (
    <div className="results-page">
      <div className="page-band is-results">
        <div className="band-eyebrow">
          Game day recap · {year}
          {week ? ` · Week ${week}` : ""}
        </div>
        <h1>Results & saved picks</h1>
        <ResultsFilters
          seasons={seasons}
          weeks={weeks.map((row) => row.week)}
          players={entries.map((row) => ({
            id: row.entry_id,
            name: `${row.name_first} ${row.name_last}${row.active ? "" : " (inactive)"}`,
          }))}
          year={year}
          week={week}
          entry={entry}
        />
      </div>
      {entry && !!d?.games.length && (
        <section className="result-summary" aria-label="Weekly pick summary">
          {(["correct", "incorrect", "pending", "missing"] as const).map((state) => (
            <div className={`card summary-${state}`} key={state}>
              <span>{labels[state]}</span>
              <strong>{d.games.filter((game) => outcome(game) === state).length}</strong>
            </div>
          ))}
        </section>
      )}
      {d?.games.length ? (
        <GamePickCards
          data={d}
          picks={allPicks}
          entries={entries}
          entry={entry ?? me}
          me={me}
          compact
        />
      ) : (
        <p className="card">No games are published for this selection.</p>
      )}
      <p className="results-note muted">
        Selected players appear first under their team. Percentages count recorded picks only.
      </p>
      <p className="muted results-intro">
        See the winners and who picked each team.{" "}
        <a className="text-link" href={entry ? "/history?entry=" + entry : "/history"}>
          Explore player history →
        </a>
      </p>
    </div>
  );
}
