"use client";
import { useState } from "react";
import AdminForm from "@/components/admin-form";
import { correctPick } from "@/app/admin/actions";
type Game = { game_id:number; year:number; week:number; away_team_id:number; home_team_id:number };
export default function CorrectionForm({ players, games, names }: { players: {entry_id:number; name_first:string; name_last:string}[]; games:Game[]; names:Record<number,string> }) {
  const [gameId,setGameId] = useState(games[0]?.game_id ?? 0);
  const game = games.find(row=>row.game_id===gameId);
  if (!players.length || !game) return <p>Add players and games before recording corrections.</p>;
  return <AdminForm action={correctPick} className="form-stack"><label>Player <select required name="entry_id">{players.map(player=><option key={player.entry_id} value={player.entry_id}>{player.name_first} {player.name_last}</option>)}</select></label><label>Game <select name="game_id" value={gameId} onChange={event=>setGameId(Number(event.target.value))}>{games.map(row=><option key={row.game_id} value={row.game_id}>{row.year} W{row.week}: {names[row.away_team_id]} at {names[row.home_team_id]}</option>)}</select></label><label>Replacement team <select key={gameId} name="team_id" required><option value="">Choose a matchup team</option>{[game.away_team_id,game.home_team_id].map(id=><option key={id} value={id}>{names[id]}</option>)}</select></label><label>Reason <textarea required name="reason" maxLength={1000} rows={3} /></label><label className="check-label"><input key={gameId} type="checkbox" required name="confirm_correction" /> I verified this correction, including any locked pick</label><button className="button">Record correction</button></AdminForm>;
}
