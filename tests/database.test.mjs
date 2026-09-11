import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { localStack } from './helpers/local-stack.mjs';

// SQL runs in a real embedded PostgreSQL engine, never against the linked project.
// Supabase's roles/auth.uid are emulated; Docker integration remains a release gate.
let db;
const admin = '10000000-0000-0000-0000-000000000001';
const stranger = '10000000-0000-0000-0000-000000000002';
const picks = [{ game_id: 100, team_id: 10 }, { game_id: 101, team_id: 12 }];
let requestCounter = 0;
const requestId = () => `20000000-0000-0000-0000-${String(++requestCounter).padStart(12, '0')}`;
async function submit({ entry = 1, year = 2026, week = 1, theme = 1, id = requestId(), selections = picks } = {}) {
  return db.query('select public.submit_weekly_picks($1,$2,$3,$4,$5,$6) as result',
    [entry, year, week, theme, id, JSON.stringify(selections)]);
}
async function role(name, uid = '') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
  await db.exec(`set local role ${name}`);
}
async function rejects(action, message) {
  await db.exec('savepoint expected_failure');
  await assert.rejects(action, message);
  await db.exec('rollback to savepoint expected_failure; release savepoint expected_failure');
}
function check(name, fn) {
  test(name, async () => {
    await db.exec('begin');
    try { await fn(); } finally { await db.exec('rollback'); }
  });
}

before(async () => {
  const integration = Boolean(process.env.FUKUMA_INTEGRATION_WORKDIR);
  if (integration) {
    const client = await (await localStack()).connect();
    db = { query: (...args) => client.query(...args), exec: sql => client.query(sql), close: () => client.end() };
  } else db = new PGlite();
  const version = await db.query("select current_setting('server_version_num')::integer as version");
  assert.equal(Math.floor(version.rows[0].version / 10000), 17, 'Test PostgreSQL major must match Supabase');
  if (!integration) {
    await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    -- Reproduce the inspected hosted project's permissive defaults.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, directory), 'utf8'));
  }
  }
  await db.exec(`
    insert into auth.users (id) values ('${admin}'), ('${stranger}');
    insert into private.admin_user values ('${admin}');
    insert into public.entry (entry_id,name_first,active) values
      (1,'Angelo',true),(2,'Angi',true),(3,'Former',false),(4,'No Email',true);
    insert into private.entry_contact values (1,'angelo@example.test'),(2,'angi@example.test');
    insert into public.season (year,is_current) values (2025,false),(2026,true);
    insert into public.week (year,week,published) values (2026,1,true),(2026,2,false),(2025,1,true);
    insert into public.game (game_id,year,week,away_team_id,home_team_id,win_team_id) values
      (100,2026,1,10,16,34),(101,2026,1,12,11,34),(102,2026,1,1,2,1),
      (103,2026,2,3,4,34),(104,2025,1,10,16,10);
    insert into public.theme (theme_name) values ('Retro');
    insert into public.theme (theme_name,active) values ('Retired',false);
  `);
});
after(async () => { await db?.close(); });

check('historical team IDs and reserved values are preserved', async () => {
  const { rows } = await db.query('select team_id,team_name from public.team order by team_id');
  assert.equal(rows.length, 34);
  assert.deepEqual(rows.filter(r => [10,33,34].includes(r.team_id)), [
    { team_id: 10, team_name: 'Broncos' }, { team_id: 33, team_name: 'Tie' }, { team_id: 34, team_name: 'TBD' },
  ]);
});
check('migrations revoke automatic client privileges on future objects', async () => {
  await db.exec('create table public.future_table(id integer); create sequence public.future_sequence; create function public.future_fn() returns int language sql as $$select 1$$');
  await role('anon');
  await rejects(() => db.query('select * from public.future_table'), /permission denied/);
  await rejects(() => db.query("select nextval('public.future_sequence')"), /permission denied/);
  await rejects(() => db.query('select public.future_fn()'), /permission denied/);
});
check('anonymous submissions save one pick per game and queue a private confirmation', async () => {
  await role('anon');
  const { rows } = await submit();
  assert.equal(rows[0].result.email_status, 'queued');
  assert.equal(rows[0].result.picks.length, 2);
  assert.ok(!JSON.stringify(rows).includes('@'));
  await role('postgres');
  assert.equal((await db.query('select * from private.email_outbox')).rows.length, 1);
  assert.equal((await db.query('select * from public.pick')).rows.length, 2);
});
check('request retries do not duplicate picks, revisions, or emails', async () => {
  await role('anon');
  const id = requestId();
  assert.deepEqual((await submit({ id })).rows, (await submit({ id })).rows);
  await rejects(() => submit({ id, theme: 2 }), /already used/);
  await role('postgres');
  assert.equal((await db.query('select * from private.email_outbox')).rows.length, 1);
  assert.equal((await db.query('select revision from public.weekly_submission')).rows[0].revision, 1);
});
check('resubmission updates existing picks and latest theme with a new confirmation', async () => {
  await role('anon');
  await submit();
  await submit({ theme: 2, selections: [{ game_id: 100, team_id: 16 }, picks[1]] });
  assert.equal((await db.query('select * from public.pick')).rows.length, 2);
  assert.equal((await db.query('select theme_id from public.latest_entry_theme where entry_id=1')).rows[0].theme_id, 2);
  assert.equal((await db.query('select revision from public.weekly_submission')).rows[0].revision, 2);
});
check('every open game is required and failure is atomic', async () => {
  await role('anon');
  await rejects(() => submit({ selections: [picks[0]] }), /every open game/);
  await role('postgres');
  for (const table of ['public.pick','public.weekly_submission','private.email_outbox']) {
    assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
  }
});
check('duplicate games, foreign-week games, and invalid team choices are rejected', async () => {
  await role('anon');
  await rejects(() => submit({ selections: [...picks, picks[0]] }), /Duplicate game/);
  await rejects(() => submit({ selections: [...picks, { game_id: 103, team_id: 3 }] }), /Invalid game/);
  for (const team_id of [1,33,34]) {
    await rejects(() => submit({ selections: [{ game_id: 100, team_id }, picks[1]] }), /Invalid game/);
  }
});
check('malformed and null picks cannot bypass validation', async () => {
  await role('anon');
  for (const selections of [null, {}, [null], [{ game_id: 100, team_id: null }]]) {
    await rejects(() => submit({ selections }), /required|requires/);
  }
});
check('inactive players, unpublished weeks and inactive themes fail', async () => {
  await role('anon');
  await rejects(() => submit({ entry: 3 }), /Player is not active/);
  await rejects(() => submit({ week: 2 }), /not published/);
  await rejects(() => submit({ theme: 3 }), /Theme is not active/);
});
check('players without email save picks and retry safely without becoming delivery jobs', async () => {
  await role('anon');
  const id = requestId();
  const first = (await submit({ entry: 4, id })).rows;
  assert.equal(first[0].result.email_status, 'not_queued');
  assert.equal(first[0].result.picks.length, 2);
  assert.deepEqual((await submit({ entry: 4, id })).rows, first);
  await rejects(() => submit({ entry: 4, id, theme: 2 }), /already used/);
  await role('authenticated', admin);
  await db.query("select public.admin_set_entry_email(4,'later@example.test')");
  await role('anon');
  assert.deepEqual((await submit({ entry: 4, id })).rows, first);
  assert.equal((await submit({ entry: 4 })).rows[0].result.email_status, 'queued');
  await role('postgres');
  const receipt = (await db.query('select skipped_at,sent_at,attempts from private.email_outbox where request_id=$1', [id])).rows[0];
  assert.ok(receipt.skipped_at);
  assert.equal(receipt.sent_at, null);
  assert.equal(receipt.attempts, 0);
  assert.equal((await db.query('select revision from public.weekly_submission where entry_id=4')).rows[0].revision, 2);
});

check('clearing a contact skips pending delivery and cannot revive it on re-add', async () => {
  const id = requestId();
  await submit({ id });
  await db.query('update private.email_outbox set attempts=1 where request_id=$1', [id]);
  await role('authenticated', stranger);
  await rejects(() => db.query('select public.admin_set_entry_email(1,null)'), /Administrator/);
  await role('authenticated', admin);
  await db.query('select public.admin_set_entry_email(1,null)');
  assert.equal((await db.query('select public.admin_entry_email(1) as email')).rows[0].email, null);
  await db.query("select public.admin_set_entry_email(1,'restored@example.test')");
  await role('postgres');
  assert.ok((await db.query('select skipped_at from private.email_outbox where request_id=$1', [id])).rows[0].skipped_at);
  await rejects(() => retryEmail(db, admin, id), /skipped/);
});

import { processEmailOutbox } from '../src/lib/email-worker.mjs';
check('worker sends only eligible receipts and never sends previously skipped submissions', async () => {
  await submit({ entry: 4 });
  await role('authenticated', admin);
  await db.query("select public.admin_set_entry_email(4,'added@example.test')");
  await role('postgres');
  await submit();
  await db.query("update private.email_settings set enabled=true,sender_address='league@example.test'");
  const deliveries = [];
  const result = await processEmailOutbox(db, async message => deliveries.push(message));
  assert.equal(result.sent, 1);
  assert.deepEqual(deliveries.map(message => message.to), [['angelo@example.test']]);
});
check('kickoff never locks a TBD game', async () => {
  await db.exec("update public.game set game_date_time='2000-01-01' where game_id=100");
  await role('anon');
  await submit();
});
check('locked games cannot receive new picks', async () => {
  await role('anon');
  await rejects(() => submit({ selections: [...picks, { game_id: 102, team_id: 1 }] }), /locked/);
});
check('locked picks may be echoed unchanged but never changed', async () => {
  await role('anon');
  await submit();
  await role('authenticated', admin);
  await db.exec('update public.game set win_team_id=10 where game_id=100');
  await role('anon');
  await submit();
  await rejects(() => submit({ selections: [{ game_id: 100, team_id: 16 }, picks[1]] }), /locked/);
  await submit({ selections: [picks[1]] });
});
check('an idempotent retry still succeeds after the game is locked', async () => {
  await role('anon');
  const id = requestId();
  const original = await submit({ id });
  await role('authenticated', admin);
  await db.exec('update public.game set win_team_id=10 where game_id=100');
  await role('anon');
  assert.deepEqual((await submit({ id })).rows, original.rows);
});
check('family clients cannot write tables directly or read private data', async () => {
  await role('anon');
  await rejects(() => db.exec('insert into public.pick(entry_id,game_id,team_id) values (1,100,10)'), /permission denied/);
  await rejects(() => db.exec('delete from public.pick'), /permission denied/);
  await rejects(() => db.exec('update public.game set win_team_id=10 where game_id=100'), /permission denied/);
  await rejects(() => db.query('select * from private.entry_contact'), /permission denied/);
  await rejects(() => db.query('select * from private.email_outbox'), /permission denied/);
  await rejects(() => db.query('select public.admin_entry_email(1)'), /permission denied/);
  assert.equal((await db.query('select * from public.game where game_id=103')).rows.length, 0);
});
check('authentication alone does not confer administrator rights', async () => {
  await role('authenticated', stranger);
  await rejects(() => db.exec("insert into public.entry(name_first) values ('Intruder')"), /row-level security/);
  await rejects(() => db.query('select public.admin_entry_email(1)'), /Administrator required/);
  await rejects(() => db.query("select public.admin_correct_pick(1,100,10::smallint,'test')"), /Administrator required/);
  await rejects(() => db.exec(`insert into private.admin_user values ('${stranger}')`), /permission denied/);
  assert.equal((await db.query('update public.game set win_team_id=10 where game_id=100 returning game_id')).rows.length, 0);
});
check('admins can manage entries and emails without public email exposure', async () => {
  await role('authenticated', admin);
  await db.query("select public.admin_set_entry_email(1,'new@example.test')");
  assert.equal((await db.query('select public.admin_entry_email(1) as email')).rows[0].email, 'new@example.test');
  await db.exec("update public.entry set name_first='Updated' where entry_id=1");
  await role('anon');
  const { rows } = await db.query('select * from public.entry where entry_id=1');
  assert.equal(rows[0].name_first, 'Updated');
  assert.ok(!('email' in rows[0]));
});
check('current season and week changes are transactional admin operations', async () => {
  await role('authenticated', admin);
  await db.query('select public.admin_set_current_season(2025)');
  assert.equal((await db.query('select year from public.season where is_current')).rows[0].year, 2025);
  await rejects(() => db.query('select public.admin_set_current_week(2026,2)'), /published/);
  await db.query('select public.admin_set_current_week(2026,1)');
  assert.equal((await db.query('select week from public.week where year=2026 and is_current')).rows[0].week, 1);
  await role('anon');
  await rejects(() => db.query('select public.admin_set_current_season(2026)'), /permission denied/);
});
check('administrator locked-pick corrections require a reason and leave an audit', async () => {
  await role('authenticated', admin);
  await rejects(() => db.query("select public.admin_correct_pick(1,102,2::smallint,'')"), /reason required/);
  await db.query("select public.admin_correct_pick(1,102,2::smallint,'Historical correction')");
  await role('postgres');
  const { rows } = await db.query('select * from private.admin_audit');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].actor_id, admin);
  assert.equal(rows[0].action, 'pick_correction');
});
check('result corrections are audited and recompute scores without stored totals', async () => {
  await role('anon');
  await submit();
  await role('authenticated', admin);
  await db.exec('update public.game set win_team_id=10 where game_id=100');
  assert.equal((await db.query('select correct_picks from public.weekly_standings where entry_id=1 and year=2026')).rows[0].correct_picks, 1);
  await db.exec('update public.game set win_team_id=16 where game_id=100');
  assert.equal((await db.query('select correct_picks from public.weekly_standings where entry_id=1 and year=2026')).rows[0].correct_picks, 0);
  await role('postgres');
  assert.equal((await db.query('select * from private.admin_audit')).rows.length, 2);
});
check('ties credit recorded picks, TBD does not score, and seasons remain separate', async () => {
  await role('anon');
  await submit();
  await submit({ entry: 2, selections: [{ game_id: 100, team_id: 16 }, picks[1]] });
  await role('postgres');
  await db.exec('update public.game set win_team_id=33 where game_id=100; insert into public.pick(entry_id,game_id,team_id) values (1,104,10)');
  await role('anon');
  const { rows } = await db.query('select entry_id,correct_picks,rank from public.season_standings where year=2026 order by correct_picks desc,name_first,name_last,entry_id');
  assert.equal(rows[0].entry_id, 1);
  assert.deepEqual(rows.filter(r => [1,2].includes(r.entry_id)).map(r => r.correct_picks), [1,1]);
  assert.equal(rows.find(r => r.entry_id === 4).correct_picks, 0);
  assert.equal(rows[0].rank, rows[1].rank);
});
check('matchup/week changes after picks and arbitrary winners are rejected', async () => {
  await submit();
  await rejects(() => db.exec('update public.game set home_team_id=1 where game_id=100'), /Cannot change/);
  await rejects(() => db.exec('update public.game set win_team_id=1 where game_id=100'), /check constraint/);
  await rejects(() => db.exec('insert into public.pick(entry_id,game_id,team_id) values (2,100,1)'), /matchup teams/);
});
check('historical explicit IDs work while invalid imports fail constraints', async () => {
  await db.exec("insert into public.entry(entry_id,name_first) values (9000,'Historical'); insert into public.pick(pick_id,entry_id,game_id,team_id) values (8000,9000,104,10)");
  await rejects(() => db.exec('insert into public.pick(entry_id,game_id,team_id) values (9000,104,16)'), /unique constraint/);
  await rejects(() => db.exec('insert into public.pick(entry_id,game_id,team_id) values (9999,104,10)'), /foreign key constraint/);
  await rejects(() => db.exec('insert into public.week(year,week) values (2026,0)'), /check constraint/);
});
check('all application tables have RLS and public views use caller permissions', async () => {
  const { rows } = await db.query("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity");
  assert.deepEqual(rows, []);
  const views = await db.query("select reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v'");
  assert.ok(views.rows.every(r => r.reloptions.includes('security_invoker=true')));
});

check('latest theme is based on submission time, not season/week order', async () => {
  await role('anon');
  await submit({ theme: 2 });
  await role('postgres');
  await db.exec("insert into public.weekly_submission(entry_id,year,week,theme_id,submitted_at) values (1,2025,1,1,clock_timestamp() + interval '1 second')");
  await role('anon');
  assert.equal((await db.query('select theme_id from public.latest_entry_theme where entry_id=1')).rows[0].theme_id, 1);
});

check('deactivating a theme preserves its submitted preference for default fallback', async () => {
  await role('anon');
  await submit({ theme: 2 });
  await role('authenticated', admin);
  await db.exec('update public.theme set active=false where theme_id=2');
  await role('anon');
  assert.equal((await db.query('select theme_id from public.latest_entry_theme where entry_id=1')).rows[0].theme_id, 2);
});

check('privileged functions have fixed search paths and are not PUBLIC executable', async () => {
  const { rows } = await db.query(`select p.proname,p.proconfig,
    exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prosecdef`);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.ok(row.proconfig.includes('search_path=""'), row.proname);
    assert.equal(row.public_execute, false, row.proname);
  }
});


check('team images allow admin replacement and deactivation but reject family writes', async () => {
  await role('authenticated', admin);
  const sql = "insert into public.team_theme_image(team_id,theme_id,image_url) values (10,1,$1) on conflict(team_id,theme_id) do update set image_url=excluded.image_url";
  await db.query(sql, ['https://example.test/first.png']);
  await db.query(sql, ['https://example.test/replacement.png']);
  assert.equal((await db.query('select * from public.team_theme_image where team_id=10 and theme_id=1')).rows.length, 1);
  await role('anon');
  assert.equal((await db.query('select image_url from public.team_theme_image where team_id=10')).rows[0].image_url, 'https://example.test/replacement.png');
  await rejects(() => db.query(sql, ['https://example.test/intruder.png']), /permission denied/);
  await role('authenticated', stranger);
  await rejects(() => db.query(sql, ['https://example.test/intruder.png']), /row-level security/);
  await role('authenticated', admin);
  await db.exec('update public.team_theme_image set active=false where team_id=10');
  assert.equal((await db.query('select * from public.team_theme_image where team_id=10')).rows.length, 1);
  await role('anon');
  assert.equal((await db.query('select * from public.team_theme_image where team_id=10')).rows.length, 0);
});


import { adminTransaction,savePlayerRecord,saveEmailConfiguration,retryEmail } from '../src/lib/operations.mjs';
test('operations recheck admin rights and save player/contact atomically', async () => {
  await db.exec("select setval(pg_get_serial_sequence('public.entry','entry_id'),1000)");
  await assert.rejects(()=>adminTransaction(db,stranger,()=>assert.fail('must not run')),/Administrator/);
  await assert.rejects(()=>adminTransaction(db,admin,client=>savePlayerRecord(client,{first:'Atomic Test',last:'',email:'invalid',active:true})),/check constraint/);
  assert.equal((await db.query("select * from public.entry where name_first='Atomic Test'")).rows.length,0);
  const id=await adminTransaction(db,admin,client=>savePlayerRecord(client,{first:'Atomic Test',last:'',email:'atomic@example.test',active:true}));
  await assert.rejects(()=>adminTransaction(db,admin,client=>savePlayerRecord(client,{entryId:id,first:'Must Roll Back',last:'',email:'bad',active:false})),/check constraint/);
  assert.equal((await db.query('select name_first from public.entry where entry_id=$1',[id])).rows[0].name_first,'Atomic Test');
  assert.equal((await db.query('select email from private.entry_contact where entry_id=$1',[id])).rows[0].email,'atomic@example.test');
  await db.query('delete from public.entry where entry_id=$1',[id]);
});
test('operations create a player without a contact and can add or remove one later', async () => {
  const player = {first:'Optional Contact',last:'',email:null,active:true};
  const id = await adminTransaction(db,admin,client=>savePlayerRecord(client,player));
  assert.equal((await db.query('select * from private.entry_contact where entry_id=$1',[id])).rows.length,0);
  await adminTransaction(db,admin,client=>savePlayerRecord(client,{...player,entryId:id,email:'optional@example.test'}));
  assert.equal((await db.query('select email from private.entry_contact where entry_id=$1',[id])).rows[0].email,'optional@example.test');
  await adminTransaction(db,admin,client=>savePlayerRecord(client,{...player,entryId:id}));
  assert.equal((await db.query('select * from private.entry_contact where entry_id=$1',[id])).rows.length,0);
  assert.equal((await db.query('select active from public.entry where entry_id=$1',[id])).rows[0].active,true);
});

test('email settings changes are audited and revoked actors cannot change them',async()=>{
  const settings={enabled:false,sender_address:'league@example.test',reply_to_address:null};
  await adminTransaction(db,admin,client=>saveEmailConfiguration(client,admin,settings));
  const audit=await db.query("select * from private.admin_audit where action='email_settings'");
  assert.equal(audit.rows.length,1);assert.equal(audit.rows[0].actor_id,admin);
  await assert.rejects(()=>adminTransaction(db,stranger,client=>saveEmailConfiguration(client,stranger,{...settings,enabled:true})),/Administrator/);
  assert.equal((await db.query('select enabled from private.email_settings')).rows[0].enabled,false);
  await db.exec("delete from private.admin_audit where action='email_settings'; update private.email_settings set sender_address=null");
});
test('manual retries preserve saved confirmations and cannot requeue delivered mail',async()=>{
  const id=requestId();await submit({id});
  await db.query("update private.email_outbox set attempts=5,last_error='failed' where request_id=$1",[id]);
  const before=(await db.query('select confirmation from private.email_outbox where request_id=$1',[id])).rows[0].confirmation;
  await adminTransaction(db,admin,client=>retryEmail(client,admin,id));
  const after=(await db.query('select attempts,confirmation from private.email_outbox where request_id=$1',[id])).rows[0];
  assert.equal(after.attempts,0);assert.deepEqual(after.confirmation,before);
  await db.query('update private.email_outbox set sent_at=now(),attempts=1 where request_id=$1',[id]);
  await assert.rejects(()=>adminTransaction(db,admin,client=>retryEmail(client,admin,id)),/already sent/);
});

import { setDefaultThemeRecord } from '../src/lib/operations.mjs';
test('default theme changes are atomic and reject inactive targets',async()=>{
 await adminTransaction(db,admin,client=>setDefaultThemeRecord(client,2));
 await assert.rejects(()=>adminTransaction(db,admin,client=>setDefaultThemeRecord(client,3)),/active/);
 assert.equal((await db.query('select theme_id from public.theme where is_default')).rows[0].theme_id,2);
 await adminTransaction(db,admin,client=>setDefaultThemeRecord(client,1));
});
