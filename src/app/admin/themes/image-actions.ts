"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { httpsImageUrl } from "@/lib/theme-images.mjs";

export async function saveTeamImage(_state: { message: string; ok: boolean }, form: FormData) {
  const supabase = await requireAdmin();
  const teamId = Number(form.get("team_id"));
  const themeId = Number(form.get("theme_id"));
  const imageUrl = httpsImageUrl(String(form.get("image_url") ?? "").trim());
  const thumbnail = String(form.get("thumbnail_url") ?? "").trim();
  const thumbnailUrl = thumbnail ? httpsImageUrl(thumbnail) : null;
  if (!Number.isInteger(teamId) || teamId < 1 || teamId > 32 || !Number.isSafeInteger(themeId) || themeId < 1)
    return { ok: false, message: "Choose a valid team and theme." };
  if (!imageUrl || (thumbnail && !thumbnailUrl))
    return { ok: false, message: "Use complete HTTPS image URLs without embedded credentials (maximum 2,048 characters)." };
  try {
    const { error } = await supabase.from("team_theme_image").upsert({
      team_id: teamId, theme_id: themeId, image_url: imageUrl,
      thumbnail_url: thumbnailUrl, active: form.get("active") === "on",
    }, { onConflict: "team_id,theme_id" }).select("team_theme_image_id").single();
    if (error) return { ok: false, message: "Image could not be saved. Confirm the theme still exists and try again." };
  } catch {
    return { ok: false, message: "Unable to confirm the save. Check your connection and retry; this will not create duplicate images." };
  }
  revalidatePath("/admin/themes");
  revalidatePath("/picks");
  return { ok: true, message: "Team image saved." };
}
