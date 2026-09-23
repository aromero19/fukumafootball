import { readLeague, readStandings, readWeeks, readPublishedSeasons, queryNumber } from "@/lib/data";

export default async function Standings({ searchParams }: { searchParams: Promise<{ year?: string; week?: string }> }) {
  const league = await readLeague(), q = await searchParams, seasons = await readPublishedSeasons();
  const year = queryNumber(q.year, 1920, 9999) ?? (league.hasCurrentSeason ? league.year : seasons[0] ?? league.year);
  const week = queryNumber(q.week, 1, 22);
  const [standings, weeks] = await Promise.all([readStandings(year, week), readWeeks(year)]);
  const rows = year < league.year ? standings.filter(row => Number(row.scored_picks) > 0) : standings;

  return <>
    <div className="eyebrow">{year} season</div>
    <h1>{week ? "Week " + week : "Season"} standings</h1>
    <nav className="toolbar week-toolbar" aria-label="Standings season">
      {seasons.map(season => <a className="button secondary" key={season} href={"/standings?year=" + season} aria-current={season === year ? "page" : undefined}>{season}</a>)}
    </nav>
    <nav className="toolbar week-toolbar" aria-label="Standings week">
      <a className="button secondary" href={"/standings?year=" + year} aria-current={!week ? "page" : undefined}>Season total</a>
      {weeks.map(row => <a className="button secondary" key={row.week} href={"/standings?year=" + year + "&week=" + row.week} aria-current={row.week === week ? "page" : undefined}>Week {row.week}</a>)}
    </nav>
    <div className="card table-scroll">
      {rows.length ? <table className="table">
        <thead><tr><th>Rank</th><th>Player</th><th>Correct picks</th><th>Scored picks</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.entry_id}>
          <td>{row.rank}</td>
          <td><a href={"/results?year=" + year + (week ? "&week=" + week : "") + "&entry=" + row.entry_id}>{row.name_first} {row.name_last}</a></td>
          <td>{row.correct_picks}</td><td>{row.scored_picks}</td>
        </tr>)}</tbody>
      </table> : <p>No published standings for this selection yet.</p>}
    </div>
  </>;
}
