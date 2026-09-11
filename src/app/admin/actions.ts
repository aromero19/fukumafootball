"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { InputError, text, integer, emailAddress, kickoffTime } from "@/lib/validation.mjs";
import { operationsAccess, operationsDatabase } from "@/lib/operations-server";
import { savePlayerRecord, setDefaultThemeRecord } from "@/lib/operations.mjs";
const value = (form: FormData, name: string) => text(form, name, 20000);
async function runAdmin(operation: (supabase: Awaited<ReturnType<typeof requireAdmin>>) => Promise<void>) {
  const supabase = await requireAdmin();
  try {
    await operation(supabase);
    for (const route of ["/", "/admin", "/picks", "/results", "/standings", "/rules"]) revalidatePath(route);
    return { ok: true, message: "Saved successfully." };
  } catch (error) {
    return { ok: false, message: error instanceof InputError ? error.message : "Unable to confirm the save. Refresh and check the record before trying again." };
  }
}

export async function saveLeagueContent(formData: FormData) {
  return runAdmin(async (supabase) => {
  const { error } = await supabase.from("league_settings").update({
    league_message: value(formData, "league_message"),
    rules: value(formData, "rules"),
  }).eq("singleton", true).select("singleton").single();
  if (error) throw new InputError("Unable to save league content.");
  revalidatePath("/");
  revalidatePath("/rules");
  revalidatePath("/admin/rules");
  });
}

export async function createSeason(formData: FormData) {
  return runAdmin(async (supabase) => {
  const year = integer(formData, "year", 1920, 9999);
  if (!Number.isInteger(year) || year < 1920 || year > 9999) throw new InputError("Enter a valid season year.");
  const { error } = await supabase.from("season").insert({ year, active: true });
  if (error) throw new InputError("Unable to create season. It may already exist.");
  revalidatePath("/admin/seasons");
  });
}

export async function createWeek(formData: FormData) {
  return runAdmin(async (supabase) => {
  const year = integer(formData, "year", 1920, 9999);
  const week = integer(formData, "week", 1, 22);
  if (!Number.isInteger(week) || week < 1 || week > 22) throw new InputError("Week must be between 1 and 22.");
  const { error } = await supabase.from("week").insert({ year, week, published: false });
  if (error) throw new InputError("Unable to create week. Create the season first and avoid duplicates.");
  revalidatePath("/admin/seasons");
  });
}

export async function saveWeek(formData: FormData) {
  return runAdmin(async (supabase) => {
  const year = integer(formData, "year", 1920, 9999);
  const week = integer(formData, "week", 1, 22);
  const makeCurrent = formData.get("set_current") === "on";
  if (makeCurrent) {
    const { error } = await supabase.rpc("admin_set_current_week", { p_year: year, p_week: week });
    if (error) throw new InputError("Unable to set current week. It must be published.");
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/picks");
    revalidatePath("/results");
    revalidatePath("/standings");
    revalidatePath("/admin/seasons");
    return;
  }
  const { error } = await supabase.from("week").update({
    published: formData.get("published") === "on",
    ...(formData.get("published") !== "on" ? { is_current: false } : {}),
  }).eq("year", year).eq("week", week).select("week").single();
  if (error) throw new InputError("Unable to save week.");
  revalidatePath("/admin/seasons");
  revalidatePath("/picks");
  revalidatePath("/results");
  });
}

export async function setCurrentSeason(formData: FormData) {
  return runAdmin(async (supabase) => {
  const { error } = await supabase.rpc("admin_set_current_season", { p_year: integer(formData, "year", 1920, 9999) });
  if (error) throw new InputError("Unable to set current season. It must be active.");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/seasons");
  revalidatePath("/picks");
  revalidatePath("/results");
  revalidatePath("/standings");
  });
}

export async function createGame(formData: FormData) {
  return runAdmin(async (supabase) => {
  const year = integer(formData, "year", 1920, 9999);
  const week = integer(formData, "week", 1, 22);
  const awayTeamId = integer(formData, "away_team_id", 1, 32);
  const homeTeamId = integer(formData, "home_team_id", 1, 32);
  if (awayTeamId === homeTeamId) throw new InputError("Away and home teams must differ.");
  const gameDateTime = value(formData, "game_date_time");
  const kickoff = kickoffTime(gameDateTime);
  const { error } = await supabase.from("game").insert({
    year, week, away_team_id: awayTeamId, home_team_id: homeTeamId,
    game_date_time: kickoff,
  });
  if (error) throw new InputError("Unable to create game. Confirm its week and matchup are unique.");
  revalidatePath("/admin/games");
  revalidatePath("/picks");
  revalidatePath("/results");
  });
}

export async function saveGameResult(formData: FormData) {
  return runAdmin(async (supabase) => {
  if (formData.get("confirm_result") !== "on") throw new InputError("Confirm the result change before saving.");
  const gameId = integer(formData, "game_id");
  const winTeamId = integer(formData, "win_team_id", 1, 34);
  const { error } = await supabase.from("game").update({ win_team_id: winTeamId }).eq("game_id", gameId).select("game_id").single();
  if (error) throw new InputError("Unable to save result. The selected winner must be a matchup team, Tie, or TBD.");
  revalidatePath("/admin/games");
  revalidatePath("/results");
  revalidatePath("/standings");
  });
}

export async function createTheme(formData: FormData) {
  return runAdmin(async (supabase) => {
  const themeName = value(formData, "theme_name");
  if (!themeName) throw new InputError("Theme name is required.");
  const { error } = await supabase.from("theme").insert({
    theme_name: themeName,
    description: value(formData, "description"),
    sort_order: integer(formData, "sort_order", -2147483648, 2147483647),
  });
  if (error) throw new InputError("Unable to create theme. Theme names must be unique.");
  revalidatePath("/admin/themes");
  revalidatePath("/picks");
  });
}

export async function saveTheme(formData: FormData) {
  return runAdmin(async (supabase) => {
  const themeId = integer(formData, "theme_id");
  const { error } = await supabase.from("theme").update({
    theme_name: value(formData, "theme_name"),
    description: value(formData, "description"),
    sort_order: integer(formData, "sort_order", -2147483648, 2147483647),
    active: formData.get("active") === "on",
  }).eq("theme_id", themeId).select("theme_id").single();
  if (error) throw new InputError("Unable to save theme.");
  revalidatePath("/admin/themes");
  revalidatePath("/picks");
  });
}

export async function correctPick(formData: FormData) {
  return runAdmin(async (supabase) => {
  if (formData.get("confirm_correction") !== "on") throw new InputError("Confirm the correction before saving.");
  const entryId = integer(formData, "entry_id");
  const gameId = integer(formData, "game_id");
  const teamId = integer(formData, "team_id", 1, 32);
  const reason = value(formData, "reason");
  if (!reason) throw new InputError("A correction reason is required.");
  const { error } = await supabase.rpc("admin_correct_pick", {
    p_entry_id: entryId, p_game_id: gameId, p_team_id: teamId, p_reason: reason,
  });
  if (error) throw new InputError("Unable to correct pick. Select a player and one of the matchup teams.");
  revalidatePath("/admin/corrections");
  revalidatePath("/results");
  revalidatePath("/standings");
  });
}

async function persistPlayer(form: FormData, create: boolean) {
  const { actorId } = await operationsAccess();
  try {
    const player = { entryId: create ? null : integer(form, "entry_id"), first: text(form, "name_first", 100, true), last: text(form, "name_last", 100), email: emailAddress(text(form, "email", 254, true)), active: create || form.get("active") === "on" };
    await operationsDatabase(actorId, client => savePlayerRecord(client, player));
    revalidatePath("/admin/players"); revalidatePath("/picks"); revalidatePath("/standings"); revalidatePath("/admin");
    return { ok: true, message: create ? "Player and email created." : "Player and email saved." };
  } catch (error) { return { ok: false, message: error instanceof InputError ? error.message : "Unable to confirm the save. Refresh and check the player before retrying." }; }
}
export async function createPlayer(form: FormData) { return persistPlayer(form, true); }
export async function savePlayer(form: FormData) { return persistPlayer(form, false); }
export async function saveSeason(form: FormData) {
  return runAdmin(async supabase => {
    const active = form.get("active") === "on";
    const { error } = await supabase.from("season").update({ active, ...(!active ? { is_current: false } : {}) }).eq("year", integer(form,"year",1920,9999)).select("year").single();
    if (error) throw new InputError("Unable to update season.");
    revalidatePath("/admin/seasons");
  });
}
export async function saveGameTime(form: FormData) {
  return runAdmin(async supabase => {
    const { error } = await supabase.from("game").update({ game_date_time: kickoffTime(text(form,"game_date_time",60)) }).eq("game_id",integer(form,"game_id")).select("game_id").single();
    if (error) throw new InputError("Unable to update kickoff.");
    revalidatePath("/admin/games");
  });
}
export async function deleteGame(form: FormData) {
  return runAdmin(async supabase => {
    if (form.get("confirm_delete") !== "on") throw new InputError("Confirm game removal first.");
    const { error } = await supabase.from("game").delete().eq("game_id",integer(form,"game_id")).select("game_id").single();
    if (error) throw new InputError("Unable to remove game. Games with picks must be retained; use corrections instead.");
    revalidatePath("/admin/games");
  });
}

export async function setDefaultTheme(form: FormData) {
 const {actorId}=await operationsAccess();
 try {
  await operationsDatabase(actorId,client=>setDefaultThemeRecord(client,integer(form,"theme_id")));
  revalidatePath("/admin/themes");revalidatePath("/picks");
  return {ok:true,message:"Default theme updated."};
 } catch(error) { return {ok:false,message:error instanceof InputError?error.message:"Unable to confirm the default theme change. Refresh to check."}; }
}
