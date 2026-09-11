-- Optional contacts: keep immutable request receipts for safe retries, even without delivery.
-- Existing player, game, pick and confirmation records are preserved.
alter table private.email_outbox add column skipped_at timestamptz;
comment on column private.email_outbox.skipped_at is 'Delivery intentionally skipped; never eligible for automatic or manual retry.';

create or replace function public.admin_set_entry_email(p_entry_id bigint, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator required'; end if;
  -- Coordinate contact removal with delivery. Do not wait behind a running worker
  -- while holding an entry lock in the enclosing player-save transaction.
  if not pg_try_advisory_xact_lock(7062026,1) then
    raise exception 'Email delivery is running. Retry after the worker finishes';
  end if;
  -- Matches submission's entry lock so removing a contact cannot miss a new job.
  perform 1 from public.entry where entry_id = p_entry_id for update;
  if not found then raise exception 'Player does not exist'; end if;
  if nullif(btrim(p_email), '') is null then
    delete from private.entry_contact where entry_id = p_entry_id;
    update private.email_outbox set skipped_at = clock_timestamp(), last_error = null
      where entry_id = p_entry_id and sent_at is null and skipped_at is null;
  else
    insert into private.entry_contact (entry_id, email) values (p_entry_id, p_email)
      on conflict (entry_id) do update set email = excluded.email;
  end if;
end;
$$;
revoke all on function public.admin_set_entry_email(bigint, text) from public;
grant execute on function public.admin_set_entry_email(bigint, text) to authenticated;

create or replace function public.submit_weekly_picks(
  p_entry_id bigint, p_year integer, p_week integer, p_theme_id bigint,
  p_request_id uuid, p_picks jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb;
  v_existing private.email_outbox;
  v_result jsonb;
  v_revision integer;
  v_has_email boolean;
begin
  if p_request_id is null or p_picks is null or jsonb_typeof(p_picks) <> 'array' then
    raise exception 'A request ID and picks array are required';
  end if;
  v_payload := jsonb_build_object('entry_id', p_entry_id, 'year', p_year, 'week', p_week,
    'theme_id', p_theme_id, 'picks', p_picks);
  -- A request ID is an idempotency key, not an identity credential.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_existing from private.email_outbox where request_id = p_request_id;
  if found then
    if v_existing.request_payload <> v_payload then
      raise exception 'Request ID was already used for a different submission';
    end if;
    return v_existing.confirmation;
  end if;
  perform 1 from public.entry where entry_id = p_entry_id and active for share;
  if not found then raise exception 'Player is not active'; end if;
  perform 1 from public.season where year = p_year and active for share;
  if not found then raise exception 'Season is not active'; end if;
  perform 1 from public.week where year = p_year and week = p_week and published for update;
  if not found then raise exception 'Week is not published'; end if;
  perform 1 from public.theme where theme_id = p_theme_id and active for share;
  if not found then raise exception 'Theme is not active'; end if;
  select exists (select 1 from private.entry_contact where entry_id = p_entry_id) into v_has_email;
  -- Lock results before validating or writing picks, in a consistent order.
  perform 1 from public.game where year = p_year and week = p_week order by game_id for update;
  if not exists (select 1 from public.game where year = p_year and week = p_week) then
    raise exception 'Week has no games';
  end if;
  if exists (select 1 from jsonb_array_elements(p_picks) p
    where jsonb_typeof(p) <> 'object' or p->>'game_id' is null or p->>'team_id' is null) then
    raise exception 'Each pick requires game_id and team_id';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_picks) as p(game_id bigint, team_id smallint)
    group by game_id having count(*) > 1) then
    raise exception 'Duplicate game in submission';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_picks) as p(game_id bigint, team_id smallint)
    left join public.game g on g.game_id = p.game_id
    where g.game_id is null or g.year <> p_year or g.week <> p_week
      or p.team_id not in (g.away_team_id, g.home_team_id)
  ) then raise exception 'Invalid game or selected team'; end if;
  if exists (
    select 1 from public.game g where g.year = p_year and g.week = p_week and g.win_team_id = 34
    and not exists (select 1 from jsonb_to_recordset(p_picks) as p(game_id bigint, team_id smallint)
      where p.game_id = g.game_id)
  ) then raise exception 'Select a team for every open game'; end if;
  -- Locked games may be omitted or echoed unchanged, never added/changed.
  if exists (
    select 1 from jsonb_to_recordset(p_picks) as p(game_id bigint, team_id smallint)
    join public.game g on g.game_id = p.game_id
    left join public.pick existing on existing.entry_id = p_entry_id and existing.game_id = g.game_id
    where g.win_team_id <> 34 and (existing.pick_id is null or existing.team_id <> p.team_id)
  ) then raise exception 'Game is locked'; end if;
  insert into public.pick (entry_id, game_id, team_id)
    select p_entry_id, p.game_id, p.team_id
    from jsonb_to_recordset(p_picks) as p(game_id bigint, team_id smallint)
    join public.game g on g.game_id = p.game_id where g.win_team_id = 34
    on conflict (entry_id, game_id) do update set team_id = excluded.team_id;
  insert into public.weekly_submission (entry_id, year, week, theme_id, submitted_at)
    values (p_entry_id, p_year, p_week, p_theme_id, clock_timestamp())
    on conflict (entry_id, year, week) do update set theme_id = excluded.theme_id,
      submitted_at = excluded.submitted_at, revision = public.weekly_submission.revision + 1
    returning revision into v_revision;
  v_result := jsonb_build_object('entry_id', p_entry_id, 'year', p_year, 'week', p_week,
    'theme_id', p_theme_id, 'revision', v_revision, 'email_status', case when v_has_email then 'queued' else 'not_queued' end,
    'picks', (select coalesce(jsonb_agg(jsonb_build_object('game_id', p.game_id, 'team_id', p.team_id)
      order by p.game_id), '[]'::jsonb) from public.pick p join public.game g using (game_id)
      where p.entry_id = p_entry_id and g.year = p_year and g.week = p_week));
  insert into private.email_outbox (request_id, entry_id, year, week, request_payload, confirmation, skipped_at)
    values (p_request_id, p_entry_id, p_year, p_week, v_payload, v_result,
      case when v_has_email then null else clock_timestamp() end);
  return v_result;
end;
$$;

revoke all on function public.submit_weekly_picks(bigint, integer, integer, bigint, uuid, jsonb) from public;
grant execute on function public.submit_weekly_picks(bigint, integer, integer, bigint, uuid, jsonb) to anon, authenticated;
