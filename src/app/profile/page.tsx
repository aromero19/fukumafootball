import Link from "next/link";
import { queryNumber, readEntries } from "@/lib/data";
import ProfileAvatar from "@/components/profile-avatar";
import ProfilePhotoForm from "@/components/profile-photo-form";

export const metadata = { title: "Profile | Fukuma Football" };

export default async function Profile({ searchParams }: { searchParams: Promise<{ entry?: string }> }) {
  const query = await searchParams;
  const players = (await readEntries()).filter(player => player.active);
  const entryId = queryNumber(query.entry, 1, Number.MAX_SAFE_INTEGER);
  const player = players.find(row => row.entry_id === entryId);
  return <>
    <div className="section-title"><div><div className="eyebrow">Family profiles</div><h1>{player ? "Your profile" : "Choose your profile"}</h1></div></div>
    <p>Choose your own name to update your photo. Like picks, profiles use the honor system: anyone can select a name, so please edit only your own profile.</p>
    {player ? <section className="card profile-editor">
      <div className="selected-profile"><h2>{player.name_first} {player.name_last}</h2><Link href="/profile">Change profile</Link></div>
      <ProfilePhotoForm key={player.entry_id} entryId={player.entry_id} photoUrl={player.photo_url} />
      <p><Link href={`/picks?entry=${player.entry_id}`}>Make your picks →</Link></p>
    </section> : <>
      {query.entry && <p className="status">That profile is unavailable. Choose an active player below.</p>}
      <div className="profile-grid">{players.map(row => <Link className="card profile-tile" key={row.entry_id} href={`/profile?entry=${row.entry_id}`}><ProfileAvatar url={row.photo_url} /><strong>{row.name_first} {row.name_last}</strong><span className="muted">Edit profile →</span></Link>)}</div>
      {!players.length && <p className="card">No active players are available. Contact the administrator.</p>}
    </>}
  </>;
}
