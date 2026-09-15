"use client";
import { useState } from "react";
import AdminForm from "@/components/admin-form";
import ProfileAvatar from "@/components/profile-avatar";
import { updateProfilePhoto } from "@/app/profile/actions";
import { httpsImageUrl } from "@/lib/theme-images.mjs";

export default function ProfilePhotoForm({ entryId, photoUrl }: { entryId: number; photoUrl: string | null }) {
  const [url, setUrl] = useState(photoUrl ?? "");
  return <AdminForm action={updateProfilePhoto} className="form-stack">
    <input type="hidden" name="entry_id" value={entryId} />
    <div className="profile-photo-preview"><ProfileAvatar key={url} url={httpsImageUrl(url.trim())} /><span className="muted">Photo preview</span></div>
    <label>Profile image URL<input name="photo_url" type="url" maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://example.com/my-photo.jpg" aria-describedby="photo-help" /></label>
    <p id="photo-help" className="muted">Paste a publicly accessible HTTPS image link. Square photos work best. Missing or unavailable photos display a gray silhouette. Leave the field blank and save to remove your photo.</p>
    <div className="toolbar"><button className="button" type="submit">Save profile photo</button></div>
  </AdminForm>;
}
