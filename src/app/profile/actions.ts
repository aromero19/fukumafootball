"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { httpsImageUrl } from "@/lib/theme-images.mjs";

export async function updateProfilePhoto(form: FormData) {
  const entryId = Number(form.get("entry_id"));
  const raw = String(form.get("photo_url") ?? "").trim();
  const url = raw ? httpsImageUrl(raw) : null;
  if (!Number.isSafeInteger(entryId) || entryId < 1) return { ok: false, message: "Choose an active profile first." };
  if (raw && !url) return { ok: false, message: "Use a complete HTTPS image URL without credentials, up to 2,048 characters." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_profile_photo", { p_entry_id: entryId, p_photo_url: url });
  if (error) return { ok: false, message: "Your photo could not be saved. Check that your profile is still active and try again." };
  for (const path of ["/profile", "/picks", "/picks/success", "/admin/players", "/results", "/standings"]) revalidatePath(path);
  return { ok: true, message: url ? "Your profile photo is saved." : "Your photo has been cleared. Your profile now uses the gray silhouette." };
}
