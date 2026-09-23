import { readEntries, readLeague, readStandings, readWeeks, readPublishedSeasons, queryNumber } from "@/lib/data";

import SeasonFilters from "@/components/season-filters";
import ProfileAvatar from "@/components/profile-avatar";

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
    <SeasonFilters path="/standings" seasons={seasons} weeks={weeks.map(row => row.week)} year={year} week={week} seasonTotal />
    <p className="muted">The $ icon means the admin has confirmed payment. Money status reflects the current entry setup, including when viewing past seasons.</p>
    <div className="card table-scroll">
      {rows.length ? <table className="table leaderboard-table">
        <thead><tr><th>Rank</th><th>Player</th><th className="numeric">Correct picks</th><th>Playing for money</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.entry_id} className={Number(row.rank) <= 3 ? "leader-row" : undefined}>
          <td><span className={`leader-rank rank-${row.rank}`}>{row.rank}</span></td>
          <td><div className="player-identity"><ProfileAvatar small url={entries.find(entry => entry.entry_id === row.entry_id)?.photo_url ?? null} /><a href={"/results?year=" + year + (week ? "&week=" + week : "") + "&entry=" + row.entry_id}>{row.name_first} {row.name_last}</a></div></td>
          <td className="numeric score">{row.correct_picks}</td><td>{moneyEntries.has(row.entry_id) ? <span className="money-status" role="img" aria-label="Yes, playing for money" title="Playing for money — confirmed by admin">$</span> : <a className="money-invite" href="/PlayForMoney">Want to play for money?</a>}</td>
        </tr>)}</tbody>
      </table> : <p>No published standings for this selection yet.</p>}
    </div>
  </>;
}
