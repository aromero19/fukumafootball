-- All exposed tables use RLS. Honor-system clients can read published league
-- information, but writes go through the validated submission function.
do $$
declare t text;
begin
  foreach t in array array['entry','team','season','week','game','pick','theme',
    'team_theme_image','weekly_submission','league_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_admin()))', t);
  end loop;
  foreach t in array array['entry','season','week','game','theme','team_theme_image','league_settings'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_write on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
end;
$$;
-- The fixed historical team registry is migration-owned.
grant usage on sequence public.entry_entry_id_seq, public.game_game_id_seq,
  public.theme_theme_id_seq, public.team_theme_image_team_theme_image_id_seq to authenticated;
create policy family_read on public.entry for select to anon, authenticated using (true);
create policy family_read on public.team for select to anon, authenticated using (true);
create policy family_read on public.season for select to anon, authenticated using (true);
create policy family_read on public.week for select to anon, authenticated using (published);
create policy family_read on public.game for select to anon, authenticated using (
  exists (select 1 from public.week w where w.year = game.year and w.week = game.week and w.published)
);
create policy family_read on public.pick for select to anon, authenticated using (
  exists (select 1 from public.game g where g.game_id = pick.game_id)
);
create policy family_read on public.weekly_submission for select to anon, authenticated using (
  exists (select 1 from public.week w where w.year = weekly_submission.year and w.week = weekly_submission.week and w.published)
);
create policy family_read on public.theme for select to anon, authenticated using (true);
create policy family_read on public.team_theme_image for select to anon, authenticated using (active);
create policy family_read on public.league_settings for select to anon, authenticated using (true);

alter table private.entry_contact enable row level security;
alter table private.admin_user enable row level security;
alter table private.admin_audit enable row level security;
alter table private.email_outbox enable row level security;
alter table private.email_settings enable row level security;
-- Workers use a server-only connection; private is intentionally not a Data API schema.
grant usage on schema private to service_role;
grant select on private.entry_contact, private.email_settings to service_role;
grant select, update on private.email_outbox to service_role;

revoke all on function public.submit_weekly_picks(bigint, integer, integer, bigint, uuid, jsonb) from public;
grant execute on function public.submit_weekly_picks(bigint, integer, integer, bigint, uuid, jsonb) to anon, authenticated;
revoke all on function public.admin_correct_pick(bigint, bigint, smallint, text) from public;
grant execute on function public.admin_correct_pick(bigint, bigint, smallint, text) to authenticated;
revoke all on function private.guard_game(), private.guard_pick() from public, anon, authenticated;

create function public.admin_entry_email(p_entry_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator required'; end if;
  return (select email from private.entry_contact where entry_id = p_entry_id);
end;
$$;
create function public.admin_set_entry_email(p_entry_id bigint, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator required'; end if;
  insert into private.entry_contact (entry_id, email) values (p_entry_id, p_email)
    on conflict (entry_id) do update set email = excluded.email;
end;
$$;
revoke all on function public.admin_entry_email(bigint), public.admin_set_entry_email(bigint, text) from public;
grant execute on function public.admin_entry_email(bigint), public.admin_set_entry_email(bigint, text) to authenticated;

-- Views inherit caller RLS and cannot reveal unpublished weeks or contact data.
create view public.pick_result with (security_invoker = true) as
select p.pick_id, p.entry_id, g.game_id, g.year, g.week, p.team_id, g.win_team_id,
  g.win_team_id <> 34 as locked,
  case when g.win_team_id = 34 then 0
       when g.win_team_id = 33 or p.team_id = g.win_team_id then 1 else 0 end as correct
from public.pick p join public.game g using (game_id);

create view public.weekly_standings with (security_invoker = true) as
with scores as (
  select w.year, w.week, e.entry_id, e.name_first, e.name_last,
    coalesce(sum(r.correct), 0)::bigint as correct_picks,
    count(r.pick_id) filter (where r.locked) as scored_picks
  from public.week w cross join public.entry e
  left join public.pick_result r on r.year = w.year and r.week = w.week and r.entry_id = e.entry_id
  where w.published and (e.active or exists (
    select 1 from public.pick_result h where h.entry_id = e.entry_id and h.year = w.year and h.week = w.week))
  group by w.year, w.week, e.entry_id, e.name_first, e.name_last
)
select *, rank() over (partition by year, week order by correct_picks desc) as rank
from scores;

create view public.season_standings with (security_invoker = true) as
with scores as (
  select year, entry_id, name_first, name_last, sum(correct_picks)::bigint as correct_picks,
    sum(scored_picks)::bigint as scored_picks
  from public.weekly_standings group by year, entry_id, name_first, name_last
)
select *, rank() over (partition by year order by correct_picks desc) as rank from scores;

create view public.latest_entry_theme with (security_invoker = true) as
select distinct on (s.entry_id) s.entry_id, s.theme_id, s.submitted_at
from public.weekly_submission s
order by s.entry_id, s.submitted_at desc, s.year desc, s.week desc;

grant select on public.pick_result, public.weekly_standings, public.season_standings,
  public.latest_entry_theme to anon, authenticated;

comment on view public.weekly_standings is 'Order by correct_picks DESC, name_first, name_last, entry_id. Tied scores share rank. A missing pick earns no credit, including tied games.';
comment on table private.admin_user is 'Explicit admin allowlist. Bootstrap only through a trusted operator connection; never via a family or self-enrollment endpoint.';
