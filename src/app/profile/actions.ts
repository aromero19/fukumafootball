"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { httpsImageUrl } from "@/lib/theme-images.mjs";

export async function updatePickReminder(form: FormData) {
  const entryId = Number(form.get("entry_id"));
  const day = Number(form.get("day"));
  const time = String(form.get("send_time") ?? "");
  const timezone = String(form.get("timezone") ?? "");
  if (!Number.isSafeInteger(entryId) || entryId < 1 || !form.has("day") || !Number.isInteger(day) || day < 0 || day > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || timezone.length > 100) return { ok: false, message: "Choose a valid profile, day, time, and time zone." };
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { return { ok: false, message: "Choose a valid time zone." }; }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_pick_reminder_setting", { p_entry_id: entryId, p_enabled: form.get("enabled") === "on", p_day: day, p_send_time: time, p_timezone: timezone });
  if (error) return { ok: false, message: "Reminder settings could not be saved. Check that your profile is active and has an email address with the administrator, then try again shortly." };
  revalidatePath("/profile");
  return { ok: true, message: form.get("enabled") === "on" ? "Your weekly pick reminder is on. Your schedule is saved." : "Your weekly pick reminder is off. Your schedule is saved." };
}

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
