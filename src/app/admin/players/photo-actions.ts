"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { httpsImageUrl } from "@/lib/theme-images.mjs";

export async function savePlayerPhoto(form: FormData) {
  const supabase = await requireAdmin();
  const entryId = Number(form.get("entry_id"));
  const raw = String(form.get("photo_url") ?? "").trim();
  const photoUrl = raw ? httpsImageUrl(raw) : null;
  if (!Number.isSafeInteger(entryId) || entryId < 1) return { ok: false, message: "Choose a valid player." };
  if (raw && !photoUrl) return { ok: false, message: "Use a complete HTTPS image URL without credentials (maximum 2,048 characters)." };
  const { error } = await supabase.from("entry").update({ photo_url: photoUrl }).eq("entry_id", entryId).select("entry_id").single();
  if (error) return { ok: false, message: "Photo could not be saved. Refresh and try again." };
  revalidatePath("/admin/players");
  revalidatePath("/profile");
  revalidatePath("/picks");
  revalidatePath("/picks/success");
  return { ok: true, message: photoUrl ? "Profile photo saved." : "Profile photo removed; using the silhouette." };
}
