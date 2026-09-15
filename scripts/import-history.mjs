import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connectOperations } from '../src/lib/operations-connection.mjs';

// No submissions RPC: historical recovery must never queue email or change themes.
export async function importHistory(client, plan) {
  if (!plan.games.length || !plan.picks.length) throw new Error('Empty import');
  if (plan.games.some(g => g.year < 2016 || g.year > 2024 || ![g.away,g.home,33].includes(g.winner))) throw new Error('Invalid historical game');
  await client.query('select pg_advisory_xact_lock(20162024)');
  await client.query('lock table public.entry, public.season, public.week, public.game, public.pick in share row exclusive mode');
  const before = (await client.query('select entry_id,active from public.entry order by entry_id')).rows;
  const active = (await client.query('select year from public.season where (active or is_current) and year = any($1::integer[])', [[...new Set(plan.games.map(r=>r.year))]])).rows;
  if (active.length) throw new Error('Refusing to import into an active season');
  await client.query('create temporary table history_players(name text primary key, entry_id bigint) on commit drop');
  for (const name of plan.players) {
    const found = (await client.query("select entry_id from public.entry where lower(btrim(name_first || ' ' || name_last))=lower($1)", [name])).rows;
    if (found.length > 1) throw new Error(`Ambiguous player: ${name}`);
    const [first,...last] = name.split(' ');
    const id = found[0]?.entry_id ?? (await client.query('insert into public.entry(name_first,name_last,active) values($1,$2,false) returning entry_id',[first,last.join(' ')])).rows[0].entry_id;
    await client.query('insert into history_players values($1,$2)',[name,id]);
  }
  await client.query(`create temporary table history_games on commit drop as select * from jsonb_to_recordset($1::jsonb)
    as x(key text,year integer,week integer,away smallint,home smallint,winner smallint)`,[JSON.stringify(plan.games)]);
  await client.query('create unique index on history_games(key)');
  await client.query('create unique index on history_games(year,week,away,home)');
  await client.query(`insert into public.season(year,active,is_current) select distinct year,false,false from history_games on conflict do nothing`);
  await client.query(`insert into public.week(year,week,published,is_current) select distinct year,week,true,false from history_games on conflict do nothing`);
  const hidden = (await client.query('select 1 from public.week w join history_games h using(year,week) where not w.published or w.is_current limit 1')).rows;
  if (hidden.length) throw new Error('Existing week is unpublished or current');
  const conflict = (await client.query(`select 1 from public.game g join history_games h on (g.year,g.week,g.away_team_id,g.home_team_id)=(h.year,h.week,h.away,h.home) where g.win_team_id<>h.winner limit 1`)).rows;
  if (conflict.length) throw new Error('Existing result conflicts with archive');
  await client.query(`insert into public.game(year,week,away_team_id,home_team_id,win_team_id)
    select year,week,away,home,winner from history_games on conflict do nothing`);
  await client.query(`create temporary table history_picks on commit drop as select e.entry_id,g.game_id,p.team
    from jsonb_to_recordset($1::jsonb) as p(name text,game text,team smallint)
    join history_players e on e.name=p.name join history_games h on h.key=p.game
    join public.game g on (g.year,g.week,g.away_team_id,g.home_team_id)=(h.year,h.week,h.away,h.home)`,[JSON.stringify(plan.picks)]);
  const staged=Number((await client.query('select count(*) n from history_picks')).rows[0].n);
  if(staged!==plan.picks.length) throw new Error('Unmapped picks');
  await client.query('create unique index on history_picks(entry_id,game_id)');
  const pickConflict=(await client.query('select 1 from history_picks h join public.pick p using(entry_id,game_id) where p.team_id<>h.team limit 1')).rows;
  if(pickConflict.length) throw new Error('Existing pick conflicts with archive');
  const inserted=await client.query('insert into public.pick(entry_id,game_id,team_id) select entry_id,game_id,team from history_picks on conflict do nothing');
  const after=(await client.query('select entry_id,active from public.entry order by entry_id')).rows;
  if(before.some(e=>after.find(a=>String(a.entry_id)===String(e.entry_id))?.active!==e.active)) throw new Error('Existing activity changed');
  return {newPlayers:after.filter(a=>!before.some(b=>String(a.entry_id)===String(b.entry_id))),insertedPicks:inserted.rowCount ?? inserted.affectedRows,stagedPicks:staged};
}

if (process.argv[1]?.endsWith('import-history.mjs')) {
  const raw=await readFile('.historical-source/import-plan.json','utf8');
  const plan=JSON.parse(raw),apply=process.argv.includes('--apply');
  const client=await connectOperations();
  try {
    await client.query('begin');
    await client.query("set local statement_timeout = '120s'");
    const result=await importHistory(client,plan);
    const report={applied:apply,planSha256:createHash('sha256').update(raw).digest('hex'),...result,players:plan.players,coverage:plan.coverage,issues:plan.issues,revisions:plan.revisions,sources:plan.sources,scheduleSource:plan.scheduleSource,scheduleSha256:plan.scheduleSha256};
    await mkdir('reports',{recursive:true});
    // Persist a reviewable report before committing; errors still roll back.
    await writeFile(`reports/historical-import-${apply?'applied':'preview'}.json`,JSON.stringify(report,null,2)+'\n');
    await client.query(apply?'commit':'rollback');
    console.log(JSON.stringify({applied:apply,...result}));
  } catch(error) { await client.query('rollback'); throw error; }
  finally { await client.end(); }
}
