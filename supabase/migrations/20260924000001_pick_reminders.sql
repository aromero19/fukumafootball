create table private.pick_reminder_setting (
  entry_id bigint primary key references public.entry on delete cascade,
  enabled boolean not null default false,
  day integer not null default 3 check (day between 0 and 6),
  send_time time not null default '18:00',
  timezone text not null default 'America/Denver'
);
create table private.pick_reminder_delivery (
  entry_id bigint references public.entry on delete cascade,
  year integer not null,
  week integer not null,
  request_id uuid not null default gen_random_uuid() unique,
  message jsonb not null,
  attempts integer not null default 0,
  first_attempt_at timestamptz not null default clock_timestamp(),
  sent_at timestamptz,
  last_error text,
  primary key (entry_id, year, week),
  foreign key (year, week) references public.week
);
alter table private.pick_reminder_setting enable row level security;
alter table private.pick_reminder_delivery enable row level security;

-- Honor-system profile access. Never expose the private contact address.
create function public.get_pick_reminder_setting(p_entry_id bigint)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('enabled', coalesce(r.enabled,false), 'day',coalesce(r.day,3),
    'send_time',coalesce(r.send_time,'18:00'::time), 'timezone',coalesce(r.timezone,'America/Denver'),
    'has_email',exists(select 1 from private.entry_contact c where c.entry_id=e.entry_id))
  from public.entry e left join private.pick_reminder_setting r using(entry_id)
  where e.entry_id=p_entry_id and e.active;
$$;
create function public.update_pick_reminder_setting(p_entry_id bigint,p_enabled boolean,p_day integer,p_send_time time,p_timezone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_enabled is null or p_day is null or p_day not between 0 and 6 or p_send_time is null
    or p_send_time >= '24:00'::time or extract(second from p_send_time) <> 0
    or p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
    raise exception 'Invalid reminder schedule';
  end if;
  if not pg_try_advisory_xact_lock(7062026,1) then raise exception 'Email delivery is running. Try again shortly'; end if;
  perform 1 from public.entry where entry_id=p_entry_id and active for update;
  if not found then raise exception 'Active player required'; end if;
  if p_enabled and not exists(select 1 from private.entry_contact where entry_id=p_entry_id) then
    raise exception 'Ask the administrator to add your email address first';
  end if;
  insert into private.pick_reminder_setting(entry_id,enabled,day,send_time,timezone)
    values(p_entry_id,p_enabled,p_day,p_send_time,p_timezone)
    on conflict(entry_id) do update set enabled=excluded.enabled,day=excluded.day,
      send_time=excluded.send_time,timezone=excluded.timezone;
end;
$$;
revoke all on function public.get_pick_reminder_setting(bigint) from public;
revoke all on function public.update_pick_reminder_setting(bigint,boolean,integer,time,text) from public;
grant execute on function public.get_pick_reminder_setting(bigint) to anon,authenticated;
grant execute on function public.update_pick_reminder_setting(bigint,boolean,integer,time,text) to anon,authenticated;

-- Pick the requested weekday/time immediately preceding first kickoff. Unknown
-- kickoff times suppress reminders rather than risking a post-kickoff message.
create function private.due_pick_reminders(p_now timestamptz)
returns table(entry_id bigint,year integer,week integer,email text,first_kickoff timestamptz)
language sql stable set search_path = '' as $$
  with upcoming as (
    select w.year,w.week,min(g.game_date_time) as kickoff
    from public.week w join public.season s using(year) join public.game g using(year,week)
    where s.active and s.is_current and w.is_current and w.published
    group by w.year,w.week
    having count(*)=count(g.game_date_time) and min(g.game_date_time)>p_now
      and bool_and(g.win_team_id=34)
  ), schedules as (
    select r.entry_id,u.year,u.week,c.email,u.kickoff,r.timezone,
      ((u.kickoff at time zone r.timezone)::date
        - ((extract(dow from u.kickoff at time zone r.timezone)::integer-r.day+7)%7)
        + r.send_time) as local_due
    from upcoming u cross join private.pick_reminder_setting r
    join public.entry e on e.entry_id=r.entry_id and e.active
    join private.entry_contact c on c.entry_id=r.entry_id
    where r.enabled and not exists(select 1 from public.weekly_submission s
      where s.entry_id=r.entry_id and s.year=u.year and s.week=u.week)
  )
  select entry_id,year,week,email,kickoff from schedules
  where (case when local_due at time zone timezone >= kickoff then local_due-interval '7 days'
    else local_due end) at time zone timezone <= p_now;
$$;
revoke all on function private.due_pick_reminders(timestamptz) from public,anon,authenticated,service_role;
