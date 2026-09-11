import AdminForm from "@/components/admin-form";
import { requireAdmin } from "@/lib/admin";
import { saveLeagueContent } from "../actions";

export default async function AdminRules() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("league_settings").select("league_message,rules").eq("singleton", true).single();
  if (error) return <p role="alert">Unable to load league content. Refresh to retry.</p>;
  return <div className="card">
    <h2>Family content</h2>
    <AdminForm action={saveLeagueContent} className="form-stack">
      <label>League message <textarea name="league_message" defaultValue={data?.league_message ?? ""} rows={3} /></label>
      <label>Rules <textarea name="rules" defaultValue={data?.rules ?? ""} rows={14} /></label>
      <p className="muted">Rules are displayed as plain text on the family site.</p>
      <button className="button">Save content</button>
    </AdminForm>
  </div>;
}
