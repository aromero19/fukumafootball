import AdminForm from "@/components/admin-form";
import { saveSeason, createSeason, createWeek, saveWeek, setCurrentSeason } from "../actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminSeasons() {
  const supabase = await requireAdmin();
  const [{ data: seasons, error: seasonsError }, { data: weeks, error: weeksError }] = await Promise.all([
    supabase.from("season").select("year,active,is_current").order("year", { ascending: false }),
    supabase.from("week").select("year,week,published,is_current").order("year", { ascending: false }).order("week"),
  ]);
  if (seasonsError || weeksError) return <p role="alert">Unable to load seasons and weeks. Refresh to retry.</p>;
  return <div className="form-stack">
    <section className="card"><h2>Add season</h2><AdminForm action={createSeason} resetOnSuccess className="compact-form"><label>Year <input required name="year" type="number" min="1920" max="9999" /></label><button className="button">Add season</button></AdminForm></section>
    <section className="card"><h2>Season availability</h2><p>Deactivating a season stops submissions and clears its current marker. Published history remains readable.</p>{(seasons ?? []).map(season=><AdminForm action={saveSeason} key={season.year} className="compact-form"><input name="year" type="hidden" value={season.year} /><span>{season.year}</span><label className="check-label"><input name="active" type="checkbox" defaultChecked={season.active} /> Active</label><button className="button secondary">Save season</button></AdminForm>)}</section>
    <section className="card"><h2>Current season</h2><AdminForm action={setCurrentSeason} className="compact-form"><label>Season <select name="year">{(seasons ?? []).filter((season) => season.active).map((season) => <option key={season.year} value={season.year}>{season.year}{season.is_current ? " (current)" : ""}</option>)}</select></label><button className="button">Set current season</button></AdminForm></section>
    <section className="card"><h2>Add week</h2><AdminForm action={createWeek} resetOnSuccess className="compact-form"><label>Season <select name="year">{(seasons ?? []).map((season) => <option key={season.year} value={season.year}>{season.year}</option>)}</select></label><label>Week <input required name="week" type="number" min="1" max="22" /></label><button className="button">Add week</button></AdminForm></section>
    <section className="card"><h2>Weeks</h2><p>Unpublishing a week hides it from families and clears its current marker.</p><div className="form-stack">{(weeks ?? []).map((item) => <AdminForm action={saveWeek} className="week-form" key={item.year + "-" + item.week}><input name="year" type="hidden" value={item.year} /><input name="week" type="hidden" value={item.week} /><span>{item.year} · Week {item.week}</span><label className="check-label"><input name="published" type="checkbox" defaultChecked={item.published} /> Published</label><span className="muted">{item.is_current ? "Current" : ""}</span><button className="button secondary">Save</button><button className="button secondary" name="set_current" value="on" disabled={!item.published || item.is_current}>Set current</button></AdminForm>)}</div></section>
  </div>;
}
