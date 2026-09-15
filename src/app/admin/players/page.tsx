import ProfileAvatar from "@/components/profile-avatar";
import { savePlayerPhoto } from "./photo-actions";
import AdminForm from "@/components/admin-form";
import { createPlayer, savePlayer } from "../actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPlayers() {
  const supabase = await requireAdmin();
  const { data: players, error: playersError } = await supabase.from("entry").select("entry_id,name_first,name_last,active,photo_url").order("name_first").order("name_last").order("entry_id");
  if (playersError) return <p role="alert">Unable to load players. Refresh to retry.</p>;
  const contacts = await Promise.all((players ?? []).map(async (player) => {
    const { data, error } = await supabase.rpc("admin_entry_email", { p_entry_id: player.entry_id });
    return [player.entry_id, error ? null : data ?? ""] as const;
  }));
  if (contacts.some(([,email])=>email === null)) return <p role="alert">Unable to load player contacts. Refresh to retry.</p>;
  const emails = new Map(contacts);
  return <div className="form-stack">
    <section className="card"><h2>Add player</h2><AdminForm action={createPlayer} resetOnSuccess className="form-stack compact-form"><label>First name <input required name="name_first" /></label><label>Last name <input name="name_last" /></label><label>Email (optional) <input type="email" name="email" /></label><p className="muted">Leave email blank for players who will not receive confirmation emails.</p><button className="button">Add player</button></AdminForm></section>
    <section className="card"><h2>Profile photos</h2><p className="muted">Use a publicly accessible HTTPS image URL. Photos are cropped to a square and displayed in a circle. Leave blank to use the gray silhouette.</p>{(players ?? []).map(player => <AdminForm key={player.entry_id} action={savePlayerPhoto} className="photo-editor"><ProfileAvatar url={player.photo_url} /><input type="hidden" name="entry_id" value={player.entry_id} /><label>{player.name_first} {player.name_last}<input name="photo_url" type="url" maxLength={2048} defaultValue={player.photo_url ?? ""} placeholder="https://example.com/photo.jpg" /></label><button className="button secondary">Save photo</button></AdminForm>)}</section>
    <section className="card"><h2>Players</h2><p className="muted">Clearing an email stops future confirmations and skips any unsent confirmations. Adding an email later does not send skipped confirmations.</p><div className="form-stack">{(players ?? []).map((player) => <AdminForm action={savePlayer} className="player-form" key={player.entry_id}><input type="hidden" name="entry_id" value={player.entry_id} /><label>First <input name="name_first" required defaultValue={player.name_first} /></label><label>Last <input name="name_last" defaultValue={player.name_last} /></label><label>Email (optional) <input name="email" type="email" defaultValue={emails.get(player.entry_id) ?? ""} /></label><label className="check-label"><input name="active" type="checkbox" defaultChecked={player.active} /> Active</label><button className="button secondary">Save</button></AdminForm>)}</div></section>
  </div>;
}
