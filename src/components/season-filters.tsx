"use client";

import { useRouter } from "next/navigation";

type Props = { path: string; seasons: number[]; weeks: number[]; year: number; week?: number; entry?: number; seasonTotal?: boolean };

export default function SeasonFilters({ path, seasons, weeks, year, week, entry, seasonTotal }: Props) {
  const router = useRouter();
  function navigate(nextYear: string, nextWeek?: string) {
    const query = new URLSearchParams({ year: nextYear });
    if (nextWeek) query.set("week", nextWeek);
    if (entry) query.set("entry", String(entry));
    router.push(`${path}?${query}`);
  }
  return <div className="season-filters">
    <label>Season<select value={year} onChange={e => navigate(e.target.value)}>{seasons.map(season => <option key={season} value={season}>{season}</option>)}</select></label>
    <label>{seasonTotal ? "View" : "Week"}<select value={week ?? ""} onChange={e => navigate(String(year), e.target.value)}>{seasonTotal ? <option value="">Season total</option> : !week && <option value="">No published week</option>}{weeks.map(value => <option key={value} value={value}>Week {value}</option>)}</select></label>
  </div>;
}
