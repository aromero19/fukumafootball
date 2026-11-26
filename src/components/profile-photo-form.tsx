"use client";
import { useState } from "react";
import AdminForm from "@/components/admin-form";
import ProfileAvatar from "@/components/profile-avatar";
import { updateProfilePhoto } from "@/app/profile/actions";
import { httpsImageUrl } from "@/lib/theme-images.mjs";
import ImageUpload from "@/components/image-upload";
import { savePlayerPhoto } from "@/app/admin/players/photo-actions";

export default function ProfilePhotoForm({ entryId, photoUrl, admin = false }: { entryId: number; photoUrl: string | null; admin?: boolean }) {
  const [savedUrl, setSavedUrl] = useState(photoUrl ?? "");
  const [replacementUrl, setReplacementUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  function saved(url: string) {
    setSavedUrl(url);
    setReplacementUrl("");
    setRevision(value => value + 1);
    setUploading(false);
  }
  async function saveLink(form: FormData) {
    const removing = form.get("photo_action") === "remove";
    const nextUrl = removing ? "" : String(form.get("photo_url") ?? "").trim();
    if (!removing && !nextUrl) return { ok: false, message: "Paste a new image link first, or use Remove photo to clear your saved photo." };
    form.set("photo_url", nextUrl);
    setUploadMessage("");
    setSaving(true);
    try {
      const result = await (admin ? savePlayerPhoto : updateProfilePhoto)(form);
      if (result.ok) saved(nextUrl);
      return result;
    } finally { setSaving(false); }
  }
  const linkField = <>
    <label>Or replace with an image link<input name="photo_url" type="url" maxLength={2048} value={replacementUrl} onChange={event => setReplacementUrl(event.target.value)} placeholder="https://example.com/my-photo.jpg" aria-describedby={`photo-help-${entryId}`} /></label>
    <p id={`photo-help-${entryId}`} className="muted">Upload a photo or paste a publicly accessible HTTPS image link. Saving replaces your current photo and clears the replacement field. Only one photo is saved for your profile.</p>
  </>;
  const saveButton = <button className="button" name="photo_action" value="replace" type="submit" disabled={!replacementUrl.trim()}>Save replacement link</button>;
  const removeButton = <button className="button secondary" name="photo_action" value="remove" type="submit" formNoValidate disabled={!savedUrl}>Remove photo</button>;
  return <div className="form-stack">
    {/* The profile page already shows the saved photo in its header; admin has no header. */}
    {admin && <div className="profile-photo-preview"><ProfileAvatar key={savedUrl} url={httpsImageUrl(savedUrl)} /><span className="muted">{savedUrl ? "Current saved photo" : "No saved photo"}</span></div>}
    <ImageUpload key={revision} profile destination={`kind=${admin ? 'admin-profile' : 'profile'}&entry=${entryId}`} disabled={saving} onSaved={url => { saved(url); setUploadMessage("Your new photo is saved. Previous image choices have been cleared."); }} onBusyChange={setUploading} />
    {uploadMessage && <p role="status">{uploadMessage}</p>}
    <fieldset disabled={uploading}><AdminForm action={saveLink} className="form-stack">
      <input type="hidden" name="entry_id" value={entryId} />
      {admin ? <>
        {linkField}
        <div className="toolbar">{saveButton}{removeButton}</div>
      </> : <>
        <details className="setting-more">
          <summary>Use an image link instead</summary>
          <div className="form-stack">{linkField}{saveButton}</div>
        </details>
        {savedUrl && removeButton}
      </>}
    </AdminForm></fieldset>
  </div>;
}
