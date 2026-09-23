import Link from "next/link";
import { readLeague, readEntries, readPicksPage, readPublishedSeasons, readWeeks, queryNumber } from "@/lib/data";
import PicksForm from "@/components/picks-form";
import SeasonFilters from "@/components/season-filters";
import ProfileAvatar from "@/components/profile-avatar";

export const maxDuration = 60;

export default async function Picks({ searchParams }: { searchParams: Promise<{ year?: string; week?: string; entry?: string }> }) {
  const q = await searchParams;
  const [league, seasons, entries] = await Promise.all([readLeague(), readPublishedSeasons(), readEntries()]);
  const year = queryNumber(q.year, 1920, 9999) ?? (league.hasCurrentSeason ? league.year : seasons[0] ?? league.year);
  const weeks = await readWeeks(year);
  const week = queryNumber(q.week, 1, 22) ?? weeks.find(item => item.is_current)?.week ?? weeks[0]?.week;
  const requestedEntry = queryNumber(q.entry, 1, Number.MAX_SAFE_INTEGER);
  const players = entries.filter(row => row.active);
  const player = players.find(row => row.entry_id === requestedEntry);
  const selectionQuery = `year=${year}${week ? `&week=${week}` : ""}`;
  const data = player && week ? await readPicksPage(year, week, player.entry_id) : null;

  return <>
    <div className="section-title"><div><div className="eyebrow">Family pick sheet · {year}{week ? ` · Week ${week}` : ""}</div><h1>{player ? "Make your picks" : "Choose your profile"}</h1></div></div>
    {player ? <div className="selected-profile"><ProfileAvatar url={player.photo_url} small /><strong>{player.name_first} {player.name_last}</strong><Link href={`/picks?${selectionQuery}`}>Change profile</Link></div> : <p>Choose your name to make or edit your picks. Profiles use the honor system; everyone’s picks are public.</p>}
    <SeasonFilters path="/picks" seasons={seasons} weeks={weeks.map(row => row.week)} year={year} week={week} entry={player?.entry_id} />
    {!player ? <>
      {requestedEntry && <p className="status">That profile is unavailable. Choose an active player below.</p>}
      <div className="profile-grid">{players.map(row => <Link className="card profile-tile" key={row.entry_id} href={`/picks?${selectionQuery}&entry=${row.entry_id}`}><ProfileAvatar url={row.photo_url} /><strong>{row.name_first} {row.name_last}</strong><span className="muted">Make picks →</span></Link>)}</div>
      {!players.length && <p className="card">No active players are available. Contact the administrator.</p>}
    </> : data && week ? <PicksForm key={`${year}-${week}-${player.entry_id}`} year={year} week={week} initialEntryId={player.entry_id} {...data} /> : <p className="card">No weeks are published for this season yet.</p>}
  </>;
}
