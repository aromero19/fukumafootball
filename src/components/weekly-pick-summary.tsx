import GamePickCards from "@/components/game-pick-cards";
import { readEntries, readPicksPage, readWeeklyPicks } from "@/lib/data";

export default async function WeeklyPickSummary({ year, week, entry }: { year: number; week: number; entry: number }) {
  const [data, picks, entries] = await Promise.all([readPicksPage(year, week, entry), readWeeklyPicks(year, week), readEntries()]);
  return <section aria-labelledby="weekly-games-title">
    <div className="section-title"><div><div className="eyebrow">{year} · Week {week}</div><h2 id="weekly-games-title">This week’s games & picks</h2></div></div>
    <p className="muted">Percentages use the recorded picks for each game, rounded to whole numbers. Players who haven’t picked that game are excluded.</p>
    <GamePickCards data={data} picks={picks} entries={entries} entry={entry} />
    {!data.games.length && <p className="card">No games are published for this week.</p>}
  </section>;
}
