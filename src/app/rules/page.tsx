import { readLeague } from "@/lib/data";
export default async function Rules(){const l=await readLeague();return <><div className="eyebrow">The family playbook</div><h1>League rules</h1><div className="card"><p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{l.rules||"Rules are coming soon."}</p></div></>}
