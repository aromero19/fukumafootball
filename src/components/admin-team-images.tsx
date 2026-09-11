"use client";
import { useActionState, useState } from "react";
import { saveTeamImage } from "@/app/admin/themes/image-actions";
import TeamImage from "@/components/team-image";
import { imageCandidates } from "@/lib/theme-images.mjs";

type ImageRow = { team_id: number; theme_id: number; image_url: string; thumbnail_url: string | null; active: boolean };
type Theme = { theme_id: number; theme_name: string; is_default: boolean; active: boolean };
function ImageEditor({ team, themeId, images, defaultId }: { team: { team_id: number; team_name: string }; themeId: number; images: ImageRow[]; defaultId?: number }) {
  const image = images.find(row => row.team_id === team.team_id && row.theme_id === themeId);
  const [url, setUrl] = useState(image?.image_url ?? "");
  const [thumbnail, setThumbnail] = useState(image?.thumbnail_url ?? "");
  const [active, setActive] = useState(image?.active ?? true);
  const [state, action, pending] = useActionState(saveTeamImage, { message: "", ok: false });
  const preview = imageCandidates([...images.filter(row => !(row.team_id === team.team_id && row.theme_id === themeId)), { team_id: team.team_id, theme_id: themeId, image_url: url, thumbnail_url: thumbnail, active }], team.team_id, themeId, defaultId);
  return <form action={action} className="card form-stack">
    <h3>{team.team_name}</h3><div className="toolbar"><TeamImage key={preview.join("|")} urls={preview} /><span className="muted">Preview · falls back to Default, then team name</span></div>
    <input type="hidden" name="team_id" value={team.team_id} /><input type="hidden" name="theme_id" value={themeId} />
    <label>Image URL <input name="image_url" type="url" required maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} /></label>
    <label>Thumbnail URL (optional) <input name="thumbnail_url" type="url" maxLength={2048} value={thumbnail} onChange={event => setThumbnail(event.target.value)} /></label>
    <label className="check-label"><input name="active" type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} /> Active image</label>
    <button className="button secondary" disabled={pending}>{pending ? "Saving…" : "Save image"}</button>
    <p role={state.ok ? "status" : "alert"} aria-live="polite">{state.message}</p>
  </form>;
}
export default function AdminTeamImages({ themes, teams, images }: { themes: Theme[]; teams: { team_id: number; team_name: string }[]; images: ImageRow[] }) {
  const [themeId, setThemeId] = useState(themes.find(theme => theme.is_default)?.theme_id ?? themes[0]?.theme_id);
  const theme = themes.find(row => row.theme_id === themeId);
  return <section className="form-stack"><h2>Team images</h2>
    <p className="muted">Use publicly accessible HTTPS image links. Saving replaces this team’s image in the selected theme. Uncheck Active image to restore the Default fallback. Files are hosted separately.</p>
    <label>Manage images for <select value={themeId ?? ""} onChange={event => setThemeId(Number(event.target.value))}>{themes.map(row => <option key={row.theme_id} value={row.theme_id}>{row.theme_name}{row.active ? "" : " (inactive)"}</option>)}</select></label>
    {theme && !theme.active && <p className="status">This theme is inactive. Its images will appear to families when the theme is activated.</p>}
    {!theme && <p>Create a theme before adding images.</p>}
    <div className="grid">{theme && teams.map(team => <ImageEditor key={themeId + "-" + team.team_id} team={team} themeId={theme.theme_id} images={images} defaultId={themes.find(row => row.is_default)?.theme_id} />)}</div>
  </section>;
}
