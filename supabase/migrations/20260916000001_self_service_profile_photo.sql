-- Honor-system photo editing, matching player selection for picks.
-- Family clients still cannot update entry rows directly.
create function public.update_profile_photo(p_entry_id bigint, p_photo_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text := nullif(btrim(p_photo_url), '');
begin
  if v_url is not null and (
    length(v_url) > 2048 or v_url !~ '^https://[^/@[:space:]]+([/?#]|$)'
    or v_url ~ '[[:space:]]' or position(chr(92) in v_url) > 0
  ) then raise exception 'Use a valid HTTPS image URL without credentials'; end if;
  update public.entry set photo_url = v_url where entry_id = p_entry_id and active;
  if not found then raise exception 'Active player required'; end if;
end;
$$;
revoke all on function public.update_profile_photo(bigint, text) from public;
grant execute on function public.update_profile_photo(bigint, text) to anon, authenticated;
comment on function public.update_profile_photo(bigint, text) is 'Honor-system access: any family visitor can change an active player photo, but no other profile fields.';
