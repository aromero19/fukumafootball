-- Transactional current-marker changes for the protected administration UI.
create function public.admin_set_current_season(p_year integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator required'; end if;
  perform 1 from public.season where year = p_year and active for update;
  if not found then raise exception 'Current season must exist and be active'; end if;
  update public.season set is_current = false where is_current and year <> p_year;
  update public.season set is_current = true where year = p_year;
end;
$$;

create function public.admin_set_current_week(p_year integer, p_week integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator required'; end if;
  perform 1 from public.week where year = p_year and week = p_week and published for update;
  if not found then raise exception 'Current week must exist and be published'; end if;
  update public.week set is_current = false where year = p_year and is_current and week <> p_week;
  update public.week set is_current = true where year = p_year and week = p_week;
end;
$$;

revoke all on function public.admin_set_current_season(integer), public.admin_set_current_week(integer, integer) from public;
grant execute on function public.admin_set_current_season(integer), public.admin_set_current_week(integer, integer) to authenticated;
