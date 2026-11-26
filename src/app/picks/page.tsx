import Link from "next/link";
import { redirect } from "next/navigation";
import {
  readLeague,
  readEntries,
  readPicksPage,
  readPublishedSeasons,
  readWeeks,
  queryNumber,
  hasSubmittedPicks,
} from "@/lib/data";
import PicksForm from "@/components/picks-form";
import SeasonFilters from "@/components/season-filters";
import ProfileAvatar from "@/components/profile-avatar";
import RememberPlayer from "@/components/remember-player";
import { rememberedPlayer } from "@/lib/remembered-player";

export const maxDuration = 60;

export default async function Picks({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    week?: string;
    entry?: string;
    edit?: string;
    choose?: string;
  }>;
}) {
  const q = await searchParams;
  const [league, seasons, entries] = await Promise.all([
    readLeague(),
    readPublishedSeasons(),
    readEntries(),
  ]);
  const year =
    queryNumber(q.year, 1920, 9999) ??
    (league.hasCurrentSeason ? league.year : (seasons[0] ?? league.year));
  const weeks = await readWeeks(year);
  const week =
    queryNumber(q.week, 1, 22) ?? weeks.find((item) => item.is_current)?.week ?? weeks[0]?.week;
  const requestedEntry = queryNumber(q.entry, 1, Number.MAX_SAFE_INTEGER);
  const players = entries.filter((row) => row.active);
  const player = players.find((row) => row.entry_id === requestedEntry);
  if (!q.entry && q.choose !== "1") {
    const remembered = await rememberedPlayer();
    if (players.some((row) => row.entry_id === remembered)) {
      const next = new URLSearchParams();
      if (q.year) next.set("year", q.year);
      if (q.week) next.set("week", q.week);
      next.set("entry", String(remembered));
      redirect(`/picks?${next}`);
    }
  }
  const selectionQuery = `year=${year}${week ? `&week=${week}` : ""}`;
  if (
    player &&
    week &&
    league.hasCurrentSeason &&
    year === league.year &&
    week === league.week &&
    q.edit !== "1" &&
    (await hasSubmittedPicks(year, week, player.entry_id))
  ) {
    redirect(`/picks/success?${selectionQuery}&entry=${player.entry_id}`);
  }
  const data = player && week ? await readPicksPage(year, week, player.entry_id) : null;

  const filters = (
    <SeasonFilters
      path="/picks"
      seasons={seasons}
      weeks={weeks.map((row) => row.week)}
      year={year}
      week={week}
      entry={player?.entry_id}
      choose={q.choose === "1"}
    />
  );

  return (
    <>
      {player ? (
        <div className="page-band is-picks">
          <RememberPlayer entry={player.entry_id} />
          <div className="band-player">
            <ProfileAvatar url={player.photo_url} small />
            <h1>
              {player.name_first} {player.name_last}
            </h1>
            <Link href={`/picks?${selectionQuery}&choose=1`} aria-label="Change profile">
              Change
            </Link>
          </div>
          {filters}
        </div>
      ) : (
        <>
          <div className="page-band is-picks">
            <div className="band-eyebrow">
              Family pick sheet · {year}
              {week ? ` · Week ${week}` : ""}
            </div>
            <h1>Choose your profile</h1>
            {filters}
          </div>
          <p>
            Choose your name to make or edit your picks. Profiles use the honor system; everyone’s
            picks are public. This device will remember your choice.
          </p>
        </>
      )}
      {!player ? (
        <>
          {requestedEntry && (
            <p className="status">That profile is unavailable. Choose an active player below.</p>
          )}
          <div className="profile-grid">
            {players.map((row) => (
              <Link
                className="card profile-tile"
                key={row.entry_id}
                href={`/picks?${selectionQuery}&entry=${row.entry_id}`}
              >
                <ProfileAvatar url={row.photo_url} />
                <strong>
                  {row.name_first} {row.name_last}
                </strong>
                <span className="muted">Make picks →</span>
              </Link>
            ))}
          </div>
          {!players.length && (
            <p className="card">No active players are available. Contact the administrator.</p>
          )}
        </>
      ) : data && week ? (
        <PicksForm
          key={`${year}-${week}-${player.entry_id}`}
          year={year}
          week={week}
          initialEntryId={player.entry_id}
          {...data}
        />
      ) : (
        <p className="card">No weeks are published for this season yet.</p>
      )}
    </>
  );
}
