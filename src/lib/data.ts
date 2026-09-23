import { createClient } from "@/lib/supabase/server";
function checked<T>(result: {data:T; error:unknown}) { if (result.error) throw new Error("League data could not be loaded."); return result.data; }
export async function readLeague() {
  const s=await createClient();
  const [season,settings]=await Promise.all([s.from("season").select("year,active").eq("is_current",true).maybeSingle(),s.from("league_settings").select("league_message,rules").eq("singleton",true).maybeSingle()]);
  const current=checked(season), content=checked(settings);
  const year=current?.year ?? new Date().getFullYear();
  const week=current ? checked(await s.from("week").select("week").eq("year",year).eq("is_current",true).maybeSingle()) : null;
  return { year, week:week?.week ?? null, hasCurrentSeason:Boolean(current), message:content?.league_message ?? "Welcome to Fukuma Football!",rules:content?.rules ?? "" };
}
export async function readStandings(year:number,week?:number) {
 const s=await createClient();let q=s.from(week ? "weekly_standings":"season_standings").select("entry_id,name_first,name_last,correct_picks,scored_picks,rank").eq("year",year);
 if(week)q=q.eq("week",week);
 return (checked(await q) ?? []).sort((a,b)=>Number(b.correct_picks)-Number(a.correct_picks)||a.name_first.localeCompare(b.name_first)||a.name_last.localeCompare(b.name_last)||a.entry_id-b.entry_id);
}
export async function readWeeks(year:number) { const s=await createClient();return checked(await s.from("week").select("year,week,published,is_current").eq("year",year).eq("published",true).order("week")) ?? []; }
/** Prefer the latest published week with a recorded winner or tie, not the active pick week. */
export async function readLatestResultsWeek(year:number, publishedWeeks:number[]) {
 if(!publishedWeeks.length) return undefined;
 const s=await createClient();
 const rows=checked(await s.from("game").select("week").eq("year",year).in("week",publishedWeeks).neq("win_team_id",34).order("week",{ascending:false}).limit(1));
 return rows?.[0]?.week;
}
export async function readPublishedSeasons() { const s=await createClient();return [...new Set((checked(await s.from("week").select("year").eq("published",true).order("year",{ascending:false})) ?? []).map(week=>week.year))]; }
export async function readEntries() { const s=await createClient();return checked(await s.from("entry").select("entry_id,name_first,name_last,active,photo_url,playing_for_money").order("name_first").order("name_last").order("entry_id")) ?? []; }
export async function readPicksPage(year:number,week:number,entryId?:number) {
 const s=await createClient();
 const [g,t,th,e,p,l,i,se]=await Promise.all([
  s.from("game").select("game_id,year,week,away_team_id,home_team_id,win_team_id,game_date_time").eq("year",year).eq("week",week).order("game_date_time").order("game_id"),
  s.from("team").select("team_id,team_name").order("team_id"),
  s.from("theme").select("theme_id,theme_name,description,is_default").eq("active",true).order("sort_order").order("theme_id"),
  s.from("entry").select("entry_id,name_first,name_last").eq("active",true).order("name_first").order("name_last").order("entry_id"),
  entryId?s.from("pick").select("game_id,team_id,game!inner(year,week)").eq("entry_id",entryId).eq("game.year",year).eq("game.week",week):Promise.resolve({data:[],error:null}),
  entryId?s.from("latest_entry_theme").select("theme_id").eq("entry_id",entryId).maybeSingle():Promise.resolve({data:null,error:null}),
  s.from("team_theme_image").select("team_id,theme_id,image_url,thumbnail_url,active").eq("active",true),
  s.from("season").select("active").eq("year",year).maybeSingle(),
 ]);
 const themes=checked(th) ?? []; const latest=checked(l); const defaultThemeId=themes.find(theme=>theme.is_default)?.theme_id ?? null;
 return { games:checked(g) ?? [], teams:checked(t) ?? [], themes, entries:checked(e) ?? [], picks:checked(p) ?? [], images:checked(i) ?? [], seasonActive:checked(se)?.active ?? false, defaultThemeId, themeId:themes.some(theme=>theme.theme_id===latest?.theme_id)?latest!.theme_id:defaultThemeId };
}
export function queryNumber(value:string|undefined,min:number,max:number) { const number=Number(value);return value && Number.isSafeInteger(number)&&number>=min&&number<=max?number:undefined; }

export async function readWeeklyPicks(year:number, week:number) {
 const s=await createClient();
 const picks: {entry_id:number;game_id:number;team_id:number}[]=[];
 for(let offset=0;;offset+=1000) {
  const rows=checked(await s.from("pick").select("entry_id,game_id,team_id,game!inner(year,week)").eq("game.year",year).eq("game.week",week).order("pick_id").range(offset,offset+999)) ?? [];
  picks.push(...rows);
  if(rows.length<1000) return picks;
 }
}

export async function readPlayerHistory(entryId:number) {
 const s=await createClient();
 const rows:{year:number;week:number;correct_picks:number;scored_picks:number;rank:number}[]=[];
 for(let offset=0;;offset+=1000) {
  const page=checked(await s.from("weekly_standings").select("year,week,correct_picks,scored_picks,rank").eq("entry_id",entryId).gt("scored_picks",0).order("year").order("week").range(offset,offset+999)) ?? [];
  rows.push(...page);
  if(page.length<1000)return rows;
 }
}
