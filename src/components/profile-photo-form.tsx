"use client";
import { useState } from "react";
import AdminForm from "@/components/admin-form";
import ProfileAvatar from "@/components/profile-avatar";
import { updateProfilePhoto } from "@/app/profile/actions";
import { httpsImageUrl } from "@/lib/theme-images.mjs";
import ImageUpload from "@/components/image-upload";
import { savePlayerPhoto } from "@/app/admin/players/photo-actions";

export default function ProfilePhotoForm({ entryId, photoUrl, admin = false }: { entryId: number; photoUrl: string | null; admin?: boolean }) {
  const [url, setUrl] = useState(photoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  return <div className="form-stack"><ImageUpload profile destination={`kind=${admin ? 'admin-profile' : 'profile'}&entry=${entryId}`} onSaved={setUrl} onBusyChange={setUploading} /><fieldset disabled={uploading}><AdminForm action={admin ? savePlayerPhoto : updateProfilePhoto} className="form-stack">
    <input type="hidden" name="entry_id" value={entryId} />
    <div className="profile-photo-preview"><ProfileAvatar key={url} url={httpsImageUrl(url.trim())} /><span className="muted">Photo preview</span></div>
    <label>Profile image URL<input name="photo_url" type="url" maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://example.com/my-photo.jpg" aria-describedby="photo-help" /></label>
    <p id="photo-help" className="muted">Paste a publicly accessible HTTPS image link. Square photos work best. Missing or unavailable photos display a gray silhouette. Leave the field blank and save to remove your photo.</p>
    <div className="toolbar"><button className="button" type="submit">Save profile photo</button></div>
  </AdminForm></fieldset></div>;
}
