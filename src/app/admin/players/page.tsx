import AdminPlayerTable from "@/components/admin-player-table";
import AdminForm from "@/components/admin-form";
import { createPlayer } from "../actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPlayers() {
  const supabase = await requireAdmin();
  const { data: players, error: playersError } = await supabase.from("entry").select("entry_id,name_first,name_last,active,photo_url,playing_for_money").order("name_first").order("name_last").order("entry_id");
  if (playersError) return <p role="alert">Unable to load players. Refresh to retry.</p>;
  const contacts = await Promise.all((players ?? []).map(async (player) => {
    const { data, error } = await supabase.rpc("admin_entry_email", { p_entry_id: player.entry_id });
    return [player.entry_id, error ? null : data ?? ""] as const;
  }));
  if (contacts.some(([,email])=>email === null)) return <p role="alert">Unable to load player contacts. Refresh to retry.</p>;
  const emails = new Map(contacts);
  return <div className="form-stack">
    <details className="card player-add"><summary>Add player</summary><AdminForm action={createPlayer} resetOnSuccess className="form-stack compact-form"><label>First name <input required name="name_first" maxLength={100} /></label><label>Last name <input name="name_last" maxLength={100} /></label><label>Email (optional) <input type="email" name="email" maxLength={254} /></label><label className="check-label"><input name="playing_for_money" type="checkbox" /> Playing for money (payment confirmed)</label><button className="button">Add player</button></AdminForm><p className="muted">Leave email blank for players who will not receive confirmation emails.</p></details>
    <AdminPlayerTable players={(players ?? []).map(player => ({ ...player, email: emails.get(player.entry_id) ?? "" }))} />
  </div>;
}
