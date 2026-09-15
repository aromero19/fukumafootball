import Link from "next/link";
import { readEntries,readPlayerHistory,readPublishedSeasons,readWeeks,queryNumber } from "@/lib/data";
import { summarizeHistory } from "@/lib/history.mjs";
import { HistoryChart } from "@/components/history-chart";

export default async function History({searchParams}:{searchParams:Promise<{entry?:string;year?:string}>}) {
 const [q,entries,years]=await Promise.all([searchParams,readEntries(),readPublishedSeasons()]);
 const entryId=queryNumber(q.entry,1,Number.MAX_SAFE_INTEGER),year=queryNumber(q.year,1920,9999);
 const player=entries.find(e=>e.entry_id===entryId);
 const rows=player?await readPlayerHistory(player.entry_id):[];
 const seasons=summarizeHistory(rows);
 const weekly=rows.filter(r=>r.year===year);
 const points=year?weekly.map(r=>({label:`W${r.week}`,position:r.week,correct:Number(r.correct_picks),scored:Number(r.scored_picks),href:`/results?year=${year}&week=${r.week}&entry=${entryId}`})):
  seasons.map(r=>({label:String(r.year),position:r.year,correct:r.correct,scored:r.scored,href:`/history?entry=${entryId}&year=${r.year}`}));
 const total=seasons.reduce((a,r)=>({correct:a.correct+r.correct,scored:a.scored+r.scored}),{correct:0,scored:0});
 const archive=await Promise.all(years.map(async y=>({year:y,weeks:await readWeeks(y)})));
 return <div className="history-page"><div><div className="eyebrow">The family record book</div><h1>History & player trends</h1><p className="muted">Explore past seasons, revisit saved picks, and follow each player over time.</p></div>
  <form className="toolbar" method="get"><label>Player <select name="entry" defaultValue={player?.entry_id ?? ""}><option value="">Choose a player</option>{entries.map(e=><option key={e.entry_id} value={e.entry_id}>{e.name_first} {e.name_last}{e.active?"":" (inactive)"}</option>)}</select></label><label>Trend <select name="year" defaultValue={year ?? ""}><option value="">All seasons</option>{years.map(y=><option key={y} value={y}>{y} weekly</option>)}</select></label><button className="button">View history</button></form>
  {player?<><h2>{player.name_first} {player.name_last}{!player.active&&<span className="history-badge">Inactive</span>}</h2>
   <div className="grid history-stats"><div className="card"><span>Career correct picks</span><strong>{total.correct.toLocaleString()}</strong></div><div className="card"><span>Career accuracy</span><strong>{total.scored?(100*total.correct/total.scored).toFixed(1)+"%":"—"}</strong><small>{total.scored.toLocaleString()} scored picks</small></div><div className="card"><span>Seasons with results</span><strong>{seasons.length}</strong></div></div>
   {points.length?<><HistoryChart points={points} title={year?`${year} weekly accuracy`:"Accuracy by season"}/><div className="card table-scroll"><table className="table"><caption>{year?`${year} weekly results`:"Season results"} · recovered and published picks only</caption><thead><tr><th>{year?"Week":"Season"}</th><th>Correct</th><th>Scored</th><th>Accuracy</th><th>Explore</th></tr></thead><tbody>{points.map(p=><tr key={p.label}><td>{p.label}</td><td>{p.correct}</td><td>{p.scored}</td><td>{(100*p.correct/p.scored).toFixed(1)}%</td><td><Link href={p.href}>{year?"Saved picks":"Weekly trend"}</Link></td></tr>)}</tbody></table></div></>:<p className="status">No scored picks are available for this player{year?` in ${year}`:""}.</p>}
  </>:<p className="status">Choose any current or former player to see their career and weekly trends.</p>}
  <section><h2>Season archive</h2><p className="muted">Totals reflect the records available here, which may cover only part of a season. A missing week means no published records are available, rather than zero correct picks. Tied games count as correct for either selected team.</p><div className="grid">{archive.map(a=><article className="card" key={a.year}><h3>{a.year}</h3><p>{a.weeks.length} published weeks</p><div className="history-weeks">{Array.from({length:a.year>=2021?18:17},(_,i)=>i+1).map(w=>a.weeks.some(r=>r.week===w)?<Link key={w} href={`/results?year=${a.year}&week=${w}${player?`&entry=${player.entry_id}`:""}`} aria-label={`${a.year} week ${w} results`}>{w}</Link>:<span key={w} title="No published records" aria-label={`Week ${w}: no published records`}>{w}</span>)}</div><Link className="text-link" href={`/standings?year=${a.year}`}>Season standings</Link></article>)}</div>{!archive.length&&<p>No seasons have been published yet.</p>}</section>
 </div>;
}
