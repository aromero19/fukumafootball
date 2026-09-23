import { readEntries, readLeague, readStandings, readWeeks, readPublishedSeasons, queryNumber } from "@/lib/data";

export default async function Standings({ searchParams }: { searchParams: Promise<{ year?: string; week?: string }> }) {
  const league = await readLeague(), q = await searchParams, seasons = await readPublishedSeasons();
  const year = queryNumber(q.year, 1920, 9999) ?? (league.hasCurrentSeason ? league.year : seasons[0] ?? league.year);
  const week = queryNumber(q.week, 1, 22);
  const [standings, weeks, entries] = await Promise.all([readStandings(year, week), readWeeks(year), readEntries()]);
  const moneyEntries = new Set(entries.filter(entry => entry.playing_for_money).map(entry => entry.entry_id));
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
    <p className="muted">The $ icon means the admin has confirmed payment. Money status reflects the current entry setup, including when viewing past seasons.</p>
    <div className="card table-scroll">
      {rows.length ? <table className="table">
        <thead><tr><th>Rank</th><th>Player</th><th>Correct picks</th><th>Playing for money</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.entry_id}>
          <td>{row.rank}</td>
          <td><a href={"/results?year=" + year + (week ? "&week=" + week : "") + "&entry=" + row.entry_id}>{row.name_first} {row.name_last}</a></td>
          <td>{row.correct_picks}</td><td>{moneyEntries.has(row.entry_id) ? <span className="money-status" role="img" aria-label="Yes, playing for money" title="Playing for money — confirmed by admin">$</span> : <a className="money-invite" href="/PlayForMoney">Want to play for money?</a>}</td>
        </tr>)}</tbody>
      </table> : <p>No published standings for this selection yet.</p>}
    </div>
  </>;
}
