import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { before, after, test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { localStack } from '../helpers/local-stack.mjs';

let stack, observer;
const entry = 10001;
let weekCounter = 0;
before(async () => {
  stack = await localStack();
  observer = await stack.connect();
  await observer.query("insert into public.entry(entry_id,name_first) values ($1,'Integration Player')", [entry]);
  await observer.query("insert into private.entry_contact values ($1,'integration@example.test')", [entry]);
  await observer.query('insert into public.season(year) values (9900)');
});
after(async () => { await observer?.end(); });

async function blocked(pid) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const result = await observer.query('select cardinality(pg_blocking_pids($1)) > 0 as blocked', [pid]);
    if (result.rows[0].blocked) return;
    await delay(25);
  }
  throw new Error('Expected a real PostgreSQL lock wait, but none occurred');
}
const outcome = promise => promise.then(value => ({ value }), error => ({ error }));
async function family(client) { await client.query('begin; set local role anon'); }
async function submit(client, game, week, id = randomUUID(), team = 10) {
  return client.query('select public.submit_weekly_picks($1,9900,$2,1,$3,$4) as result',
    [entry, week, id, JSON.stringify([{ game_id: game, team_id: team }])]);
}
function race(name, fn) {
  test(name, { timeout: 30000 }, async () => {
    const week = ++weekCounter;
    const game = 10000 + week;
    await observer.query('insert into public.week(year,week,published) values (9900,$1,true)', [week]);
    await observer.query('insert into public.game(game_id,year,week,away_team_id,home_team_id) values ($1,9900,$2,10,16)', [game,week]);
    const a = await stack.connect();
    const b = await stack.connect();
    try {
      const pid = (await b.query('select pg_backend_pid() as pid')).rows[0].pid;
      await fn({ a, b, pid, game, week });
    } finally {
      // Release either blocker before closing the waiting connection.
      await a.query('rollback');
      await a.end();
      await b.query('rollback');
      await b.end();
    }
  });
}

race('winner committed before submission prevents a late pick', async ({ a,b,pid,game,week }) => {
  await a.query('begin');
  await a.query('update public.game set win_team_id=10 where game_id=$1', [game]);
  await family(b);
  const pending = outcome(submit(b,game,week));
  await blocked(pid);
  await a.query('commit');
  const result = await pending;
  assert.match(result.error?.message ?? '', /locked/);
  await b.query('rollback');
  assert.equal((await observer.query('select * from public.pick where game_id=$1', [game])).rowCount, 0);
});

race('submission committed before winner remains saved and then locks', async ({ a,b,pid,game,week }) => {
  await family(a);
  await submit(a,game,week);
  await b.query('begin');
  const pending = outcome(b.query('update public.game set win_team_id=16 where game_id=$1', [game]));
  await blocked(pid);
  await a.query('commit');
  const result = await pending;
  assert.equal(result.error?.code, undefined);
  await b.query('commit');
  const pick = await observer.query('select team_id from public.pick where game_id=$1', [game]);
  assert.equal(pick.rows[0].team_id, 10);
  await family(a);
  await assert.rejects(() => submit(a,game,week,randomUUID(),16), /locked/);
});

race('a concurrently added game must be picked after its transaction commits', async ({ a,b,pid,game,week }) => {
  await a.query('begin');
  await a.query('insert into public.game(game_id,year,week,away_team_id,home_team_id) values ($1,9900,$2,12,11)', [game+1000,week]);
  await family(b);
  const pending = outcome(submit(b,game,week));
  await blocked(pid);
  await a.query('commit');
  const result = await pending;
  assert.match(result.error?.message ?? '', /every open game/);
});

race('concurrent identical request IDs create one revision and one email', async ({ a,b,pid,game,week }) => {
  const id = randomUUID();
  await family(a);
  const first = await submit(a,game,week,id);
  await family(b);
  const pending = outcome(submit(b,game,week,id));
  await blocked(pid);
  await a.query('commit');
  const second = await pending;
  assert.equal(second.error?.code, undefined);
  assert.deepEqual(second.value.rows, first.rows);
  await b.query('commit');
  const count = await observer.query('select count(*)::integer as count from private.email_outbox where request_id=$1', [id]);
  assert.equal(count.rows[0].count, 1);
});

race('concurrent intentional resubmissions serialize without duplicate picks', async ({ a,b,pid,game,week }) => {
  await family(a);
  await submit(a,game,week);
  await family(b);
  const pending = outcome(submit(b,game,week,randomUUID(),16));
  await blocked(pid);
  await a.query('commit');
  const result = await pending;
  assert.equal(result.error?.code, undefined);
  assert.equal(result.value.rows[0].result.revision, 2);
  await b.query('commit');
  const picks = await observer.query('select team_id from public.pick where game_id=$1', [game]);
  assert.equal(picks.rowCount, 1);
  assert.equal(picks.rows[0].team_id, 16);
});

test('real Data API hides contact data and unpublished games', async () => {
  const api = createClient(stack.apiUrl, stack.anonKey, { auth: { persistSession: false } });
  const entries = await api.from('entry').select('*').eq('entry_id', entry);
  assert.equal(entries.error?.code, undefined);
  assert.equal(entries.data.length, 1);
  assert.equal('email' in entries.data[0], false);
  const privateRead = await api.schema('private').from('entry_contact').select('*');
  assert.ok(privateRead.error);
  const unpublished = await api.from('game').select('*').eq('game_id', 103);
  assert.equal(unpublished.error?.code, undefined);
  assert.deepEqual(unpublished.data, []);
  const bypass = await api.from('pick').insert({ entry_id: entry, game_id: 100, team_id: 10 });
  assert.ok(bypass.error);
});

test('real Auth session needs the admin allowlist before protected RPC access', async () => {
  const service = createClient(stack.apiUrl, stack.serviceKey, { auth: { persistSession: false } });
  const password = randomUUID() + randomUUID();
  const email = `fukuma-${randomUUID()}@example.test`;
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error?.code, undefined);
  const user = created.data.user;
  assert.ok(user);
  const api = createClient(stack.apiUrl, stack.anonKey, { auth: { persistSession: false } });
  const login = await api.auth.signInWithPassword({ email, password });
  assert.equal(login.error?.code, undefined);
  const denied = await api.rpc('admin_entry_email', { p_entry_id: entry });
  assert.ok(denied.error);
  await observer.query('insert into private.admin_user(user_id) values ($1)', [user.id]);
  const allowed = await api.rpc('admin_entry_email', { p_entry_id: entry });
  assert.equal(allowed.error?.code, undefined);
  assert.equal(allowed.data, 'integration@example.test');
  await observer.query('delete from private.admin_user where user_id=$1', [user.id]);
  const revoked = await api.rpc('admin_entry_email', { p_entry_id: entry });
  assert.ok(revoked.error);
  await api.auth.signOut();
  await service.auth.admin.deleteUser(user.id);
});


import { processEmailOutbox } from '../../src/lib/email-worker.mjs';
import { adminTransaction,retryEmail } from '../../src/lib/operations.mjs';
test('real worker lock prevents competing sends and manual retries while delivery is in flight',async()=>{
 const a=await stack.connect(),b=await stack.connect();
 let release,started;const gate=new Promise(resolve=>{release=resolve;});const sending=new Promise(resolve=>{started=resolve;});
 let pending;
 try {
  await observer.query("update private.email_settings set enabled=true,sender_address='league@example.test'");
  pending=processEmailOutbox(a,async()=>{started();await gate;},1);
  await Promise.race([sending,new Promise((_,reject)=>setTimeout(()=>reject(Error('Worker did not start')),8000))]);
  assert.equal((await processEmailOutbox(b,()=>assert.fail('competing send'),1)).busy,true);
  await assert.rejects(()=>adminTransaction(b,'10000000-0000-0000-0000-000000000001',client=>retryEmail(client,'10000000-0000-0000-0000-000000000001',randomUUID())),/delivery is running/);
  release();assert.equal((await pending).sent,1);
 } finally {
  release();await pending;await observer.query('update private.email_settings set enabled=false');await a.end();await b.end();
 }
});
