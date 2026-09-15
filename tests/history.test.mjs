import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { summarizeHistory } from '../src/lib/history.mjs';
import { importHistory } from '../scripts/import-history.mjs';

test('accuracy is weighted by scored picks; empty periods are omitted',()=>{
 const rows=summarizeHistory([{year:2020,correct_picks:1,scored_picks:1},{year:2020,correct_picks:0,scored_picks:9},{year:2021,correct_picks:0,scored_picks:0}]);
 assert.deepEqual(rows,[{year:2020,correct:1,scored:10,weeks:2,rate:10}]);
});

test('historical import is idempotent, keeps former players inactive, rejects conflicts, and sends no email',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$ select null::uuid $$;`);
  for(const file of ['20260910000001_core.sql','20260910000002_submission_and_admin.sql','20260910000003_access_and_standings.sql'])
   await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  await db.exec("insert into public.entry(name_first,name_last,active) values('Current','Player',true); insert into public.season values(2026,true,true)");
  const plan={players:['Current Player','Former Player'],coverage:[{year:2024}],games:[{key:'g',year:2024,week:1,away:1,home:2,winner:33}],picks:[{name:'Current Player',game:'g',team:1},{name:'Former Player',game:'g',team:2}]};
  await db.exec('begin');
  await importHistory(db,plan);
  await db.exec('commit');
  await db.exec('begin');
  await importHistory(db,plan);
  await db.exec('commit');
  assert.equal(Number((await db.query('select count(*) n from public.pick')).rows[0].n),2);
  assert.deepEqual((await db.query('select name_first,active from public.entry order by name_first')).rows,[{name_first:'Current',active:true},{name_first:'Former',active:false}]);
  assert.equal(Number((await db.query('select count(*) n from private.email_outbox')).rows[0].n),0);
  assert.equal(Number((await db.query('select count(*) n from public.weekly_submission')).rows[0].n),0);
  assert.equal((await db.query('select year from public.season where is_current')).rows[0].year,2026);
  await db.exec('set role anon');
  assert.equal((await db.query('select * from public.weekly_standings where year=2024')).rows.length,2);
  assert.ok((await db.query('select correct_picks from public.weekly_standings where year=2024')).rows.every(r=>Number(r.correct_picks)===1));
  await db.exec('reset role');
  await db.exec('begin');
  await assert.rejects(importHistory(db,{...plan,picks:[{name:'Current Player',game:'g',team:2},plan.picks[1]]}),/conflicts/);
  await db.exec('rollback');
  await db.exec('begin');
  await db.exec('update public.season set active=true where year=2024');
  await assert.rejects(importHistory(db,plan),/active season/);
  await db.exec('rollback');
 } finally {await db.close();}
});
