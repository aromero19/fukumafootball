import AdminForm from "@/components/admin-form";
import { saveSeason, createSeason, createWeek, saveWeek, setCurrentSeason } from "../actions";
import { requireAdmin } from "@/lib/admin";

type Week = { year: number; week: number; published: boolean; is_current: boolean };

function WeekRow({ item }: { item: Week }) {
  return <AdminForm action={saveWeek} className={`admin-week-row${item.is_current ? " is-current" : ""}`}><input name="year" type="hidden" value={item.year} /><input name="week" type="hidden" value={item.week} /><strong>Week {item.week}{item.is_current && <small>Current</small>}</strong><label className="check-label"><input name="published" type="checkbox" defaultChecked={item.published} /> Published</label><button className="button secondary">Save</button><button className="button secondary" name="set_current" value="on" disabled={!item.published || item.is_current}>Set current</button></AdminForm>;
}

export default async function AdminSeasons() {
  const supabase = await requireAdmin();
  const [{ data: seasons, error: seasonsError }, { data: weeks, error: weeksError }] = await Promise.all([
    supabase.from("season").select("year,active,is_current").order("year", { ascending: false }),
    supabase.from("week").select("year,week,published,is_current").order("year", { ascending: false }).order("week"),
  ]);
  if (seasonsError || weeksError) return <p role="alert">Unable to load seasons and weeks. Refresh to retry.</p>;
  const year = seasons?.find(season => season.is_current)?.year ?? seasons?.[0]?.year;
  const rows = (weeks ?? []).filter(item => item.year === year);
  const currentWeek = rows.find(item => item.is_current)?.week;
  // Current and later weeks stay open; finished ones fold away, newest first.
  const upcoming = rows.filter(item => !currentWeek || item.week >= currentWeek);
  const earlier = rows.filter(item => currentWeek && item.week < currentWeek).reverse();
  const otherYears = [...new Set((weeks ?? []).map(item => item.year))].filter(value => value !== year);
  return <div className="form-stack">
    <section className="card"><h2>{year ? `${year} weeks` : "Weeks"}</h2><p className="muted">Unpublishing a week hides it from families and clears its current marker.</p>
      {upcoming.map(item => <WeekRow key={item.week} item={item} />)}
      {!rows.length && <p>No weeks for this season yet.</p>}
      {Boolean(earlier.length) && <details className="admin-more"><summary>Earlier weeks ({earlier.length})</summary>{earlier.map(item => <WeekRow key={item.week} item={item} />)}</details>}
    </section>
    <details className="card admin-panel" open={!rows.length}><summary>Add a week</summary><AdminForm action={createWeek} resetOnSuccess className="compact-form"><label>Season <select name="year">{(seasons ?? []).map((season) => <option key={season.year} value={season.year}>{season.year}</option>)}</select></label><label>Week <input required name="week" type="number" min="1" max="22" /></label><button className="button">Add week</button></AdminForm></details>
    {otherYears.map(value => {
      const items = (weeks ?? []).filter(item => item.year === value);
      return <details className="card admin-panel" key={value}><summary>{value} weeks ({items.length})</summary>{items.map(item => <WeekRow key={item.week} item={item} />)}</details>;
    })}
    <details className="card admin-panel" open={!seasons?.length}><summary>Season settings</summary><div className="form-stack">
      <h3>Current season</h3><AdminForm action={setCurrentSeason} className="compact-form"><label>Season <select name="year">{(seasons ?? []).filter((season) => season.active).map((season) => <option key={season.year} value={season.year}>{season.year}{season.is_current ? " (current)" : ""}</option>)}</select></label><button className="button">Set current season</button></AdminForm>
      <h3>Season availability</h3><p className="muted">Deactivating a season stops submissions and clears its current marker. Published history remains readable.</p>{(seasons ?? []).map(season=><AdminForm action={saveSeason} key={season.year} className="admin-season-row"><input name="year" type="hidden" value={season.year} /><strong>{season.year}</strong><label className="check-label"><input name="active" type="checkbox" defaultChecked={season.active} /> Active</label><button className="button secondary">Save season</button></AdminForm>)}
      <h3>Add season</h3><AdminForm action={createSeason} resetOnSuccess className="compact-form"><label>Year <input required name="year" type="number" min="1920" max="9999" /></label><button className="button">Add season</button></AdminForm>
    </div></details>
  </div>;
}
