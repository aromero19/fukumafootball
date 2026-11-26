import Link from "next/link";
import { readLeague, readStandings } from "@/lib/data";
import { featureUpdates } from "@/lib/feature-updates";

export default async function Home() {
  const league = await readLeague();
  const rows = league.hasCurrentSeason ? await readStandings(league.year) : [];
  
  // Get top 3 standings for medal cards
  const topThreeRows = rows.slice(0, 3);
  
  return (
    <>
      <section className="hero home-hero">
        <div className="hero-content">
          <div className="eyebrow light">
            {league.hasCurrentSeason ? `${league.year} season` : "Welcome, family"}
            {league.week ? ` · Week ${league.week}` : ""}
          </div>
          <h1>
            Every pick has
            <br />a family story.
          </h1>
          <p style={{ whiteSpace: "pre-wrap" }}>{league.message}</p>
          <div className="hero-actions">
            <Link className="button" href="/picks">
              Make your picks <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link light-link" href="/rules">
              Read the playbook
            </Link>
          </div>
        </div>
        <div className="season-stamp" aria-hidden="true">
          <strong>FFF</strong>
          <span>EST. 2017</span>
        </div>
      </section>
      
      {topThreeRows.length > 0 ? (
        <section className="home-top-three">
          <div className="card hero-card" style={{ marginBottom: "1rem" }}>
            <h2>Top 3</h2>
            <div className="medal-grid">
              {topThreeRows.map((row, index) => (
                <div key={row.entry_id} className={`medal-card medal-${index + 1}`}>
                  <div className="medal-position">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                  </div>
                  <h3>{row.name_first} {row.name_last}</h3>
                  <p className="muted">{row.correct_picks} pts</p>
                </div>
              ))}
            </div>
            <Link className="text-link" href="/standings">
              Full standings <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="home-top-three">
          <div className="card hero-card" style={{ marginBottom: "1rem" }}>
            <h2>Top 3</h2>
            <p className="muted">Standings will appear when league data is available.</p>
          </div>
        </section>
      )}
      
      <section className="card home-news" aria-labelledby="feature-updates-title">
        <div className="eyebrow">Latest additions</div>
        <h2 id="feature-updates-title">What&apos;s new</h2>
        <ul className="feature-updates">
          {featureUpdates.slice(0, 5).map((update) => (
            <li key={update.title}>
              <h3>{update.title}</h3>
              <p className="muted">{update.description}</p>
              <Link className="text-link" href={update.href}>
                {update.linkLabel} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
