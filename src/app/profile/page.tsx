import Link from "next/link";
import { queryNumber, readEntries } from "@/lib/data";
import ProfileAvatar from "@/components/profile-avatar";
import ProfilePhotoForm from "@/components/profile-photo-form";
import PickReminderForm from "@/components/pick-reminder-form";
import { createClient } from "@/lib/supabase/server";
import { reminderSummary } from "@/lib/reminder-summary.mjs";

export const metadata = { title: "Profile | Fukuma Football" };

export default async function Profile({ searchParams }: { searchParams: Promise<{ entry?: string }> }) {
  const query = await searchParams;
  const players = (await readEntries()).filter(player => player.active);
  const entryId = queryNumber(query.entry, 1, Number.MAX_SAFE_INTEGER);
  const player = players.find(row => row.entry_id === entryId);
  const reminder = player ? await (await createClient()).rpc("get_pick_reminder_setting", { p_entry_id: player.entry_id }) : null;
  const setting = reminder && !reminder.error ? reminder.data : null;

  if (player) return <>
    <div className="page-band is-profile">
      <div className="band-player">
        <ProfileAvatar key={player.photo_url} url={player.photo_url} small />
        <h1>{player.name_first} {player.name_last}</h1>
        <Link href="/profile" aria-label="Change profile">Change</Link>
      </div>
    </div>
    <div className="settings">
      <h2 className="settings-heading">Your 2 settings</h2>
      <details className="setting" key={`photo-${player.entry_id}`}>
        <summary>
          <span className="setting-name">Photo</span>
          <span className="setting-state">{player.photo_url ? "Added" : "Not added"}</span>
        </summary>
        <div className="setting-body">
          <ProfilePhotoForm key={player.entry_id} entryId={player.entry_id} photoUrl={player.photo_url} />
        </div>
      </details>
      <details className="setting" key={`reminder-${player.entry_id}`}>
        <summary>
          <span className="setting-name">Reminder emails</span>
          <span className="setting-state">{reminderSummary(setting)}</span>
        </summary>
        <div className="setting-body">
          {setting ? <PickReminderForm entryId={player.entry_id} setting={setting} /> : <p role="status">Reminder settings could not be loaded. Please try again shortly.</p>}
        </div>
      </details>
      <Link className="button settings-picks" href={`/picks?entry=${player.entry_id}`}>Make your picks</Link>
      <p className="muted settings-note">Honor system: anyone can select a name, so please edit only your own profile.</p>
    </div>
  </>;

  return <>
    <div className="page-band is-profile"><div className="band-eyebrow">Family profiles</div><h1>Choose your profile</h1></div>
    <p>Choose your own name to update your photo and email reminders. Like picks, profiles use the honor system: anyone can select a name, so please edit only your own profile.</p>
    {query.entry && <p className="status">That profile is unavailable. Choose an active player below.</p>}
    <div className="profile-grid">{players.map(row => <Link className="card profile-tile" key={row.entry_id} href={`/profile?entry=${row.entry_id}`}><ProfileAvatar url={row.photo_url} /><strong>{row.name_first} {row.name_last}</strong><span className="muted">Edit profile →</span></Link>)}</div>
    {!players.length && <p className="card">No active players are available. Contact the administrator.</p>}
  </>;
}
