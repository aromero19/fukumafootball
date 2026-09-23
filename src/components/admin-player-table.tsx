"use client";

import { useState } from "react";
import AdminForm from "@/components/admin-form";
import ProfileAvatar from "@/components/profile-avatar";
import ProfilePhotoForm from "@/components/profile-photo-form";
import { savePlayer } from "@/app/admin/actions";

type Player = {
  entry_id: number;
  name_first: string;
  name_last: string;
  email: string;
  active: boolean;
  playing_for_money: boolean;
  photo_url: string | null;
};

function PlayerRow({ player, hidden }: { player: Player; hidden: boolean }) {
  const [editing, setEditing] = useState(false);
  const name = `${player.name_first} ${player.name_last}`.trim();
  const panelId = `player-editor-${player.entry_id}`;
  return <>
    <tr hidden={hidden}>
      <th scope="row"><div className="player-identity"><ProfileAvatar url={player.photo_url} small /><span>{name}<small>#{player.entry_id}</small></span></div></th>
      <td className="player-email">{player.email || <span className="muted">No email</span>}</td>
      <td><span className={`player-status ${player.active ? "is-active" : ""}`}>{player.active ? "Active" : "Inactive"}</span></td>
      <td>{player.playing_for_money ? <span className="player-paid"><span aria-hidden="true">$ </span>Confirmed</span> : <span className="muted">Not confirmed</span>}</td>
      <td><button className="button secondary" type="button" aria-expanded={editing} aria-controls={panelId} aria-label={`${editing ? "Close editor for" : "Edit"} ${name}`} onClick={() => setEditing(!editing)}>{editing ? "Close" : "Edit"}</button></td>
    </tr>
    <tr hidden={hidden || !editing} className="player-editor-row" id={panelId}><td colSpan={5}>
      {editing && <div className="player-editor">
        <h3>Edit {name}</h3>
        <AdminForm action={savePlayer} className="form-stack player-edit-form">
          <input type="hidden" name="entry_id" value={player.entry_id} />
          <label>First name<input name="name_first" required maxLength={100} defaultValue={player.name_first} /></label>
          <label>Last name<input name="name_last" maxLength={100} defaultValue={player.name_last} /></label>
          <label>Email (optional)<input name="email" type="email" maxLength={254} defaultValue={player.email} /></label>
          <label className="check-label"><input name="active" type="checkbox" defaultChecked={player.active} /> Active</label>
          <label className="check-label"><input name="playing_for_money" type="checkbox" defaultChecked={player.playing_for_money} /> Playing for money</label>
          <button className="button" type="submit">Save player</button>
        </AdminForm>
        <details className="player-photo-details"><summary>Edit photo for {name}</summary><div className="player-photo-editor"><ProfilePhotoForm admin entryId={player.entry_id} photoUrl={player.photo_url} /></div></details>
      </div>}
    </td></tr>
  </>;
}

export default function AdminPlayerTable({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [money, setMoney] = useState("all");
  const query = search.trim().toLocaleLowerCase();
  const matches = (p: Player) => `${p.name_first} ${p.name_last} ${p.email} ${p.entry_id}`.toLocaleLowerCase().includes(query)
    && (status === "all" || p.active === (status === "active"))
    && (money === "all" || p.playing_for_money === (money === "confirmed"));
  const count = players.filter(matches).length;
  return <section className="card player-directory">
    <div className="player-directory-heading"><h2>Players</h2><span className="muted" role="status">{count} of {players.length} players</span></div>
    <div className="player-filters">
      <label>Find a player<input type="search" placeholder="Name, email, or entry #" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All players</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label>Playing for money<select value={money} onChange={e => setMoney(e.target.value)}><option value="all">Everyone</option><option value="confirmed">Confirmed</option><option value="unconfirmed">Not confirmed</option></select></label>
    </div>
    <p className="muted player-directory-help">Edit a player to update their details or photo. Confirm money participation after checking Venmo.</p>
    <div className="table-scroll" role="region" aria-label="Player directory" tabIndex={0}>
      <table className="table admin-player-table"><caption className="sr-only">Player contact details and current participation. Each Edit button opens that player’s controls.</caption>
        <thead><tr><th scope="col">Player</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Playing for money</th><th scope="col">Actions</th></tr></thead>
        <tbody>{players.map(player => <PlayerRow key={player.entry_id} player={player} hidden={!matches(player)} />)}</tbody>
      </table>
    </div>
    {!count && <p className="status">{players.length ? "No players match these filters." : "No players yet. Use Add player to get started."}</p>}
    <details className="player-directory-notes"><summary>Email confirmation details</summary><p className="muted">Clearing an email stops future confirmations and skips unsent confirmations. Adding an email later does not send skipped confirmations.</p></details>
  </section>;
}
