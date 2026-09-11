"use client";

import { submitPicks } from "@/app/picks/actions";
import TeamImage from "@/components/team-image";
import { imageCandidates } from "@/lib/theme-images.mjs";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasEveryOpenPick, submissionPicks } from "@/lib/picks.mjs";

type Game = { game_id: number; away_team_id: number; home_team_id: number; win_team_id: number; game_date_time: string | null };
type Team = { team_id: number; team_name: string };
type Theme = { theme_id: number; theme_name: string };
type Entry = { entry_id: number; name_first: string; name_last: string };
type Pick = { game_id: number; team_id: number };
type Props = { seasonActive: boolean; images: { team_id: number; theme_id: number; image_url: string; thumbnail_url: string | null; active: boolean }[]; defaultThemeId: number | null; year: number; week: number; games: Game[]; teams: Team[]; themes: Theme[]; entries: Entry[]; picks: Pick[]; themeId: number | null; initialEntryId?: number };

export default function PicksForm({ seasonActive, images, defaultThemeId, year, week, games, teams, themes, entries, picks, themeId, initialEntryId }: Props) {
  const loadVersion = useRef(0);
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [entry, setEntry] = useState<number | "">(initialEntryId ?? "");
  const [theme, setTheme] = useState<number | "">(themes.some((item) => item.theme_id === themeId) ? themeId ?? "" : (defaultThemeId ?? themes[0]?.theme_id ?? ""));
  const [selected, setSelected] = useState<Record<number, number>>(Object.fromEntries(picks.map((pick) => [pick.game_id, pick.team_id])));
  const [requestId, setRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const names = useMemo(() => Object.fromEntries(teams.map((team) => [team.team_id, team.team_name])), [teams]);
  const themeColors = ["#ffffff", "#eef8f4", "#eef5fb", "#fff4e5", "#f8f0fb"];
  const themeColor = themeColors[Number(theme) % themeColors.length];

  async function chooseEntry(value: string) {
    if (busy.current) return;
    const version = ++loadVersion.current;
    const entryId = Number(value);
    setEntry(entryId || ""); setMessage(""); setRequestId(null); setSelected({}); setLoadFailed(false);
    setTheme(defaultThemeId ?? themes[0]?.theme_id ?? "");
    if (!entryId) { setLoading(false); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const [playerPicks, latestTheme] = await Promise.all([
        supabase.from("pick").select("game_id,team_id").eq("entry_id",entryId).in("game_id",games.map(game=>game.game_id)),
        supabase.from("latest_entry_theme").select("theme_id").eq("entry_id",entryId).maybeSingle(),
      ]);
      if (version !== loadVersion.current) return;
      if (playerPicks.error || latestTheme.error) throw new Error("Read failed");
      setSelected(Object.fromEntries((playerPicks.data ?? []).map(pick=>[pick.game_id,pick.team_id])));
      const savedTheme = latestTheme.data?.theme_id;
      setTheme(themes.some(item=>item.theme_id===savedTheme) ? savedTheme : (defaultThemeId ?? themes[0]?.theme_id ?? ""));
    } catch {
      if (version === loadVersion.current) { setLoadFailed(true); setMessage("Unable to load this player’s saved picks. Select the player again to retry."); }
    } finally { if (version === loadVersion.current) setLoading(false); }
  }

  function choosePick(game: Game, teamId: number) {
    if (game.win_team_id !== 34 || busy.current || loading || loadFailed || !seasonActive) return;
    setSelected((current) => ({ ...current, [game.game_id]: teamId }));
    setRequestId(null);
    setMessage("");
  }

  async function submit() {
    if (busy.current || loading || loadFailed || !seasonActive || !games.length) return;
    if (!entry || !theme) return setMessage("Choose a player and a theme first.");
    if (!hasEveryOpenPick(games, selected)) return setMessage("Please choose a team for every open game.");
    busy.current = true; setSubmitting(true); setMessage("");
    const id = requestId ?? crypto.randomUUID(); setRequestId(id);
    const payload = { p_entry_id:entry, p_year:year, p_week:week, p_theme_id:theme, p_request_id:id, p_picks:submissionPicks(selected) };
    try {
      const { data, error } = await submitPicks(payload);
      if (error) { setMessage("Picks were not confirmed: " + error.message + " Retry without changing your choices, or refresh to see updated game results."); return; }
      setMessage(data?.email_status === "queued" ? "Picks saved. Confirmation email is queued; it has not been sent yet." : "Picks saved. No confirmation email was queued.");
      // Keep the successful request key until choices change: repeated clicks are retries.
    } catch { setMessage("Connection interrupted. Your picks may already be saved. Retry without changing your choices to safely confirm them."); }
    finally { busy.current = false; setSubmitting(false); }
  }

  return <div className="card" style={{ backgroundColor: themeColor }}>
    <div className="toolbar">
      <label>Player <select value={entry} disabled={submitting || !seasonActive} onChange={(event) => chooseEntry(event.target.value)}><option value="">Choose a player</option>{entries.map((item) => <option key={item.entry_id} value={item.entry_id}>{item.name_first} {item.name_last}</option>)}</select></label>
      <label>Theme <select value={theme} onChange={(event) => { setTheme(Number(event.target.value)); setRequestId(null); }} disabled={!entry || submitting || loading || loadFailed || !seasonActive}>{themes.map((item) => <option key={item.theme_id} value={item.theme_id}>{item.theme_name}</option>)}</select></label>
    </div>
    {!seasonActive && <p className="status">This season is closed for submissions. Saved picks remain available in Results.</p>}
    {loading && <p role="status">Loading saved picks…</p>}
    {!games.length && <p>No games are published for this week yet.</p>}
    {!entries.length && <p>No active players are available. Contact the administrator.</p>}
    {!themes.length && <p>No active themes are available. Contact the administrator.</p>}
    {message && <div className="status" role="status">{message}</div>}
    <div>{games.map((game) => {
      const locked = game.win_team_id !== 34;
      return <div className="game" key={game.game_id}>
        <div className="game-meta"><span>{game.game_date_time ? new Date(game.game_date_time).toLocaleString("en-US",{timeZone:"America/Denver",timeZoneName:"short"}) : "Game time TBD"}</span><span>{locked ? game.win_team_id === 33 ? "Tie · locked" : `Winner: ${names[game.win_team_id]} · locked` : "Open for picks"}</span></div>
        {[game.away_team_id, game.home_team_id].map((teamId) => <button key={teamId} className={`pick-button ${selected[game.game_id] === teamId ? "selected" : ""}`} disabled={locked || !entry || submitting || loading || loadFailed || !seasonActive} onClick={() => choosePick(game, teamId)}><TeamImage key={String(theme) + "-" + teamId} urls={imageCandidates(images, teamId, theme, defaultThemeId)} />{names[teamId]}<br /><small>{teamId === game.away_team_id ? "Away" : "Home"}</small></button>)}
      </div>;
    })}</div>
    <button className="button" disabled={submitting || loading || loadFailed || !entry || !theme || !seasonActive || !games.length} onClick={submit}>{submitting ? "Saving…" : "Submit picks"}</button>
  </div>;
}
