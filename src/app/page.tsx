import Link from "next/link";
import { readLeague, readStandings } from "@/lib/data";
import { featureUpdates } from "@/lib/feature-updates";

export default async function Home() {
  const league = await readLeague();
  const rows = league.hasCurrentSeason ? await readStandings(league.year) : [];
  return <>
    <section className="hero home-hero"><div className="hero-content">
      <div className="eyebrow light">{league.hasCurrentSeason ? `${league.year} season` : "Welcome, family"}{league.week ? ` · Week ${league.week}` : ""}</div>
      <h1>Every pick has<br />a family story.</h1><p style={{ whiteSpace: "pre-wrap" }}>{league.message}</p>
      <div className="hero-actions"><Link className="button" href="/picks">Make your picks <span aria-hidden="true">→</span></Link><Link className="text-link light-link" href="/rules">Read the playbook</Link></div>
    </div><div className="season-stamp" aria-hidden="true"><strong>FFF</strong><span>EST. 2017</span></div></section>
    <section className="grid home-grid">
      <section className="card" aria-labelledby="feature-updates-title"><div className="eyebrow">Latest additions</div><h2 id="feature-updates-title">What’s new</h2>
        <ul className="feature-updates">{featureUpdates.slice(0, 5).map(update => <li key={update.title}>
          <h3>{update.title}</h3><p className="muted">{update.description}</p>
          <Link className="text-link" href={update.href}>{update.linkLabel} <span aria-hidden="true">→</span></Link>
        </li>)}</ul>
      </section>
      <div className="home-season"><div className="card"><div className="eyebrow">This week</div><h2>Current season</h2>
        <p className="muted">{league.week ? `Week ${league.week} is published. Games marked TBD remain open; a recorded result locks picks.` : "The next current week has not been announced yet. Published weeks and past results remain available."}</p>
        <Link className="text-link" href="/standings">See full standings <span aria-hidden="true">→</span></Link></div>
      <div className="card standings-card"><div className="eyebrow">Leaderboard</div><h2>Top of the table</h2>
        {rows.length ? <table className="table"><tbody>{rows.slice(0, 5).map(row => <tr key={row.entry_id}><td><span className="rank">{row.rank}</span></td><td><strong>{row.name_first} {row.name_last}</strong></td><td>{row.correct_picks} pts</td></tr>)}</tbody></table> : <p className="muted">Standings will appear when league data is available.</p>}
      </div>
      </div>
    </section>
  </>;
}
