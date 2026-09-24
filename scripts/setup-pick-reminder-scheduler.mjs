import { Client } from 'pg';
import { databaseOptions } from '../src/lib/database-options.mjs';

// Operator-only deployment utility. Never print credentials or queued HTTP headers.
const mode = process.argv[2];
if (!['prepare','enable','status'].includes(mode)) throw new Error('Use prepare, enable, or status');
const client = new Client(databaseOptions());
try {
  await client.connect();
  if (mode === 'prepare') {
    const secret = process.env.CRON_SECRET;
    const site = new URL(process.env.FUKUMA_SITE_URL);
    if (!secret || secret.length < 32 || site.protocol !== 'https:' || site.username || site.password) throw new Error('Invalid scheduler configuration');
    await client.query('begin');
    await client.query('create extension if not exists pg_cron');
    await client.query('create extension if not exists pg_net');
    for (const [name,value] of [['fukuma_reminder_cron_secret',secret],['fukuma_reminder_site_url',site.origin]]) {
      const existing = await client.query('select id from vault.secrets where name=$1', [name]);
      if (existing.rows.length) await client.query('select vault.update_secret($1,$2)', [existing.rows[0].id,value]);
      else await client.query('select vault.create_secret($1,$2)', [value,name]);
    }
    await client.query(`create or replace function private.invoke_pick_reminder_worker() returns bigint
      language sql set search_path='' as $$
        select net.http_get(
          url := (select decrypted_secret from vault.decrypted_secrets where name='fukuma_reminder_site_url') || '/api/cron/pick-reminders',
          headers := jsonb_build_object('Authorization','Bearer ' ||
            (select decrypted_secret from vault.decrypted_secrets where name='fukuma_reminder_cron_secret')),
          timeout_milliseconds := 60000);
      $$`);
    await client.query('revoke all on function private.invoke_pick_reminder_worker() from public,anon,authenticated,service_role');
    const job = await client.query("select cron.schedule('fukuma-pick-reminders','*/5 * * * *','select private.invoke_pick_reminder_worker();') as id");
    await client.query('select cron.alter_job($1,active:=false)', [job.rows[0].id]);
    await client.query('commit');
    console.log('Prepared reminder scheduler (paused until deployment is verified).');
  }
  if (mode === 'enable') {
    // Verify production has the correct key before activating recurring delivery.
    const response = await fetch(new URL('/api/cron/pick-reminders',process.env.FUKUMA_SITE_URL), {
      headers: { Authorization: 'Bearer '+process.env.CRON_SECRET },
      redirect:'error', signal:AbortSignal.timeout(65000),
    });
    const result = await response.json();
    if (!response.ok || result.disabled || result.busy || typeof result.sent !== 'number' || result.failed !== 0) throw new Error('Production reminder verification failed');
    console.log('Production reminder endpoint verified:', JSON.stringify(result));
    await client.query("select cron.alter_job(jobid,active:=true) from cron.job where jobname='fukuma-pick-reminders'");
  }
  const jobs = await client.query("select jobid,jobname,schedule,active from cron.job where jobname='fukuma-pick-reminders'");
  console.log('Scheduler:',JSON.stringify(jobs.rows));
} catch (error) {
  await client.query('rollback').catch(()=>{});
  console.error('Scheduler setup failed:',error.code ?? error.name);
  process.exitCode=1;
} finally { await client.end(); }
