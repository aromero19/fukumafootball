import AdminForm from "@/components/admin-form";
import AdminTeamImages from "@/components/admin-team-images";
import { createTheme, saveTheme, setDefaultTheme } from "../actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminThemes() {
  const supabase = await requireAdmin();
  const { data: themes, error: themesError } = await supabase.from("theme").select("theme_id,theme_name,description,active,sort_order,is_default").order("sort_order").order("theme_id");
  const [{ data: teams, error: teamsError }, { data: images, error: imagesError }] = await Promise.all([
    supabase.from("team").select("team_id,team_name").lte("team_id", 32).order("team_name"),
    supabase.from("team_theme_image").select("team_id,theme_id,image_url,thumbnail_url,active"),
  ]);
  if (themesError || teamsError || imagesError) return <p role="alert">Unable to load themes and images. Refresh to retry.</p>;
  return <div className="form-stack">
    <section className="card"><h2>Themes</h2>{(themes ?? []).map((theme) => <details className="admin-more" key={theme.theme_id}><summary>{theme.theme_name}<small>{theme.is_default ? "Default" : theme.active ? "Active" : "Inactive"}</small></summary><AdminForm action={saveTheme} className="compact-form"><input name="theme_id" type="hidden" value={theme.theme_id} />{theme.is_default && <input name="active" type="hidden" value="on" />}<label>Name <input name="theme_name" required defaultValue={theme.theme_name} /></label><label>Description <input name="description" defaultValue={theme.description} /></label><label>Sort <input name="sort_order" type="number" defaultValue={theme.sort_order} /></label><label className="check-label"><input name="active" type="checkbox" defaultChecked={theme.active} disabled={theme.is_default} /> Active</label><button className="button secondary">Save</button></AdminForm></details>)}</section>
    <section className="card"><h2>Default theme</h2><AdminForm action={setDefaultTheme} className="compact-form"><label>Active theme <select name="theme_id" defaultValue={themes?.find(theme=>theme.is_default)?.theme_id}>{(themes ?? []).filter(theme=>theme.active).map(theme=><option key={theme.theme_id} value={theme.theme_id}>{theme.theme_name}</option>)}</select></label><button className="button secondary">Set default theme</button></AdminForm></section>
    <details className="card admin-panel" open={!themes?.length}><summary>Add a theme</summary><AdminForm action={createTheme} resetOnSuccess className="compact-form"><label>Name <input required name="theme_name" /></label><label>Description <input name="description" /></label><label>Sort order <input name="sort_order" type="number" defaultValue="0" /></label><button className="button">Add theme</button></AdminForm></details>
    <AdminTeamImages themes={themes ?? []} teams={teams ?? []} images={images ?? []} />
  </div>;
}
