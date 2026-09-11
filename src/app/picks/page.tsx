import { readLeague,readPicksPage,readPublishedSeasons,readWeeks,queryNumber } from "@/lib/data";
import PicksForm from "@/components/picks-form";
export default async function Picks({searchParams}:{searchParams:Promise<{year?:string;week?:string;entry?:string}>}) {
 const q=await searchParams,league=await readLeague(),seasons=await readPublishedSeasons();
 const year=queryNumber(q.year,1920,9999) ?? (league.hasCurrentSeason?league.year:seasons[0] ?? league.year),weeks=await readWeeks(year);
 const week=queryNumber(q.week,1,22) ?? weeks.find(item=>item.is_current)?.week ?? weeks[0]?.week;
 const requestedEntry=queryNumber(q.entry,1,Number.MAX_SAFE_INTEGER);
 const data=week?await readPicksPage(year,week,requestedEntry):null;
 const entry=data?.entries.some(row=>row.entry_id===requestedEntry)?requestedEntry:undefined;
 return <><div className="section-title"><div><div className="eyebrow">Family pick sheet · honor-system player selection</div><h1>Make your picks</h1></div></div><p>Choose your own name. Names are not passwords; other players’ picks are public.</p><div className="toolbar">{seasons.map(season=><a className="button secondary" key={season} href={"/picks?year="+season}>{season}</a>)}</div><div className="toolbar"><span>Week:</span>{weeks.map(row=><a className="button secondary" key={row.week} href={"/picks?year="+year+"&week="+row.week+(entry?"&entry="+entry:"")}>W{row.week}</a>)}</div>{data&&week?<PicksForm key={year+"-"+week+"-"+entry} year={year} week={week} initialEntryId={entry} {...data} picks={entry?data.picks:[]} />:<p className="card">No weeks are published for this season yet.</p>}</>;
}
