import Image from "next/image";
import Link from "next/link";
import { readLeague } from "@/lib/data";

export default async function Rules() {
  const league = await readLeague();
  const rules: string[] = String(league.rules || "Rules are coming soon.").split(/\n\s*\n/).filter(Boolean);
  return <div className="rules-page">
    <section className="rules-hero"><div className="rules-hero-copy">
      <div className="eyebrow light">The family playbook</div><h1>Simple rules.<br />Serious bragging rights.</h1>
      <p>Everything you need to make a pick, follow the season, and keep the competition friendly.</p>
    </div><div className="rules-badge"><span>Official</span><strong>FFF</strong><small>League rules</small></div></section>
    <section className="rules-layout">
      <aside className="rules-aside"><div className="rules-photo"><Image src="/legacy/secret-ballot.jpg" alt="A ballot being placed into a box" fill sizes="(max-width: 800px) 100vw, 300px" /></div>
        <div className="aside-copy"><span className="eyebrow">The golden rule</span><h2>Make the call yourself.</h2><p>Picks stay personal. The fun is seeing where everyone lands when game day arrives.</p></div>
      </aside>
      <article className="rules-card"><div className="rules-card-header"><div><div className="eyebrow">How we play</div><h2>League rules</h2></div><span className="rule-mark">{rules.length.toString().padStart(2, "0")}</span></div>
        <div className="rule-copy">{rules.map((rule, index) => <section className="rule-row" key={`${index}-${rule.slice(0, 20)}`}><span>{(index + 1).toString().padStart(2, "0")}</span><p>{rule}</p></section>)}</div>
        <div className="rules-cta"><div><strong>Ready for kickoff?</strong><span>Put the playbook into practice.</span></div><Link className="button" href="/picks">Make your picks <span aria-hidden="true">→</span></Link></div>
      </article>
    </section>
  </div>;
}
