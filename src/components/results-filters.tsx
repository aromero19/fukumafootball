"use client";

import { useRouter } from "next/navigation";

type Props = {
  seasons: number[];
  weeks: number[];
  players: { id: number; name: string }[];
  year: number;
  week?: number;
  entry?: number;
};

export default function ResultsFilters({ seasons, weeks, players, year, week, entry }: Props) {
  const router = useRouter();
  function navigate(next: { year?: string; week?: string; entry?: string }) {
    const values = {
      year: String(year),
      week: String(week ?? ""),
      entry: String(entry ?? ""),
      ...next,
    };
    const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value));
    router.push(`/results?${query}`);
  }
  return (
    <form className="season-filters results-filters" method="get">
      <label>
        Season
        <select
          name="year"
          value={year}
          onChange={(event) => navigate({ year: event.target.value, week: "" })}
        >
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>
      <label>
        Week
        <select
          name="week"
          value={week ?? ""}
          onChange={(event) => navigate({ week: event.target.value })}
        >
          <option value="">Latest results</option>
          {weeks.map((value) => (
            <option key={value} value={value}>
              Week {value}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-player">
        Player
        <select
          name="entry"
          value={entry ?? ""}
          onChange={(event) => navigate({ entry: event.target.value })}
        >
          <option value="">Everyone’s picks</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button className="button">View results</button>
      </noscript>
    </form>
  );
}
