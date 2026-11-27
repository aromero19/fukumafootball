import { operationsAccess, operationsDatabase } from "@/lib/operations-server";
import AdminForm from "@/components/admin-form";
import { saveEmailSettings, queueEmailRetry } from "./actions";
export const maxDuration = 60;

type QueueRow = { request_id:string;year:number;week:number;created_at:Date;sent_at:Date|null;skipped_at:Date|null;attempts:number;failed:boolean;name_first:string;name_last:string };
type AuditRow = { action:string;reason:string;occurred_at:Date };
const when = (value: Date) => new Date(value).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function QueueItem({ row }: { row: QueueRow }) {
  const state = row.sent_at ? "Delivered" : row.skipped_at ? "Skipped — no email delivery" : row.attempts === 0 ? "Queued" : row.failed ? "Delivery failed or uncertain" : "Delivery pending or uncertain";
  return <div className="admin-mail"><strong>{row.name_first} {row.name_last} · {row.year} W{row.week}</strong><p><span className={row.failed && !row.sent_at && !row.skipped_at ? "is-failed" : undefined}>{state}</span> · {row.attempts} {row.attempts === 1 ? "attempt" : "attempts"} · {when(row.created_at)}</p>{!row.sent_at && !row.skipped_at && row.attempts > 0 && <AdminForm action={queueEmailRetry} className="form-stack"><input type="hidden" name="request_id" value={row.request_id} /><label className="check-label"><input type="checkbox" required name="confirm_retry" /> Retry even if it could send a duplicate</label><button className="button secondary">Queue retry</button></AdminForm>}</div>;
}

export default async function AdminEmail() {
  const { actorId, configured } = await operationsAccess();
  if (!configured) return <section className="card"><h2>Email operations setup</h2><p>The operator must configure the server-only operations connection before this page can load private email settings. Delivery also requires the production email provider configuration.</p></section>;
  let snapshot;
  try {
    snapshot = await operationsDatabase(actorId, async client => {
      const settings = await client.query("select enabled,sender_address,reply_to_address from private.email_settings where singleton");
      const counts = await client.query("select count(*) filter(where sent_at is null and skipped_at is null)::integer as pending,count(*) filter(where sent_at is not null)::integer as sent,count(*) filter(where sent_at is null and skipped_at is null and attempts>0)::integer as attempted from private.email_outbox");
      const queue = await client.query("select o.request_id,o.year,o.week,o.created_at,o.sent_at,o.skipped_at,o.attempts,(o.last_error is not null) as failed,e.name_first,e.name_last from private.email_outbox o join public.entry e using(entry_id) order by (o.sent_at is null and o.skipped_at is null) desc,o.created_at desc limit 50");
      const audits = await client.query("select action,reason,occurred_at from private.admin_audit order by audit_id desc limit 25");
      return { settings: settings.rows[0], counts: counts.rows[0], queue: queue.rows as QueueRow[], audits: audits.rows as AuditRow[] };
    });
  } catch { return <p role="alert">Private operations data could not be loaded. Refresh to retry or ask the operator to check the connection.</p>; }
  if (!snapshot.settings) return <p role="alert">Email settings are missing. Contact the operator.</p>;
  const settings = snapshot.settings;
  const waiting = snapshot.queue.filter(row => !row.sent_at && !row.skipped_at);
  const finished = snapshot.queue.filter(row => row.sent_at || row.skipped_at);
  return <div className="form-stack">
    <div className="admin-stats is-three"><div className="card"><strong>{snapshot.counts.pending}</strong><span>Pending</span></div><div className="card"><strong>{snapshot.counts.attempted}</strong><span>Tried, still pending</span></div><div className="card"><strong>{snapshot.counts.sent}</strong><span>Delivered</span></div></div>
    <section className="card"><h2>Waiting to send</h2>{waiting.map(row => <QueueItem key={row.request_id} row={row} />)}{!waiting.length && <p>{snapshot.queue.length ? "Nothing is waiting." : "No confirmation emails have been queued."}</p>}
      {Boolean(finished.length) && <details className="admin-more"><summary>Delivered and skipped ({finished.length})</summary>{finished.map(row => <QueueItem key={row.request_id} row={row} />)}</details>}
      <details className="admin-more"><summary>How delivery works</summary><p className="muted">This page lists the latest 50 messages, pending first. Automatic delivery tries at most five times and stops retrying messages more than 23 hours old after their first attempt. New submissions and confirmed retries attempt delivery automatically in production. Failed or interrupted delivery stays queued for review; the operator can run the worker to recover pending messages. A worker failure after provider acceptance can leave delivery uncertain.</p></details>
    </section>
    <details className="card admin-panel" open={!settings.enabled}><summary>Email settings<small>{settings.enabled ? "On" : "Off"}</small></summary><p className="muted">Use a sender verified with the email provider. Saved picks remain valid even when delivery is disabled or fails.</p>
    <AdminForm action={saveEmailSettings} className="form-stack">
      <label>Sender email <input name="sender_address" type="email" maxLength={254} defaultValue={settings.sender_address ?? ""} /></label>
      <label>Reply-to email (optional) <input name="reply_to_address" type="email" maxLength={254} defaultValue={settings.reply_to_address ?? ""} /></label>
      <label className="check-label"><input name="enabled" type="checkbox" defaultChecked={settings.enabled} /> Enable confirmation emails</label>
      <label className="check-label"><input name="confirm_enable" type="checkbox" /> I understand enabling delivery may send queued confirmations</label>
      <button className="button">Save settings</button>
    </AdminForm></details>
    <details className="card admin-panel"><summary>Recent administrator activity</summary><ul>{snapshot.audits.map((row,index) => <li key={index}>{when(row.occurred_at)} · {row.action} · {row.reason}</li>)}</ul>{!snapshot.audits.length && <p>No audited activity yet.</p>}</details>
  </div>;
}
