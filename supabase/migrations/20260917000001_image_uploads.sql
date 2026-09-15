create table private.image_upload_attempt (
  target text not null,
  is_profile boolean not null,
  created_at timestamptz not null default now()
);
create index image_upload_attempt_created on private.image_upload_attempt(created_at);
alter table private.image_upload_attempt enable row level security;
revoke all on private.image_upload_attempt from public, anon, authenticated, service_role;

-- Public reads; no browser write policies. Only the server Storage credential writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', true, 2097152, array['image/webp']),
       ('team-themes', 'team-themes', true, 2097152, array['image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive policies also block any pre-existing broad browser-write policy.
create policy app_images_server_insert on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id not in ('player-photos', 'team-themes'));
create policy app_images_server_update on storage.objects as restrictive for update to anon, authenticated
using (bucket_id not in ('player-photos', 'team-themes'))
with check (bucket_id not in ('player-photos', 'team-themes'));
create policy app_images_server_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id not in ('player-photos', 'team-themes'));
