-- Public profile images use administrator-managed HTTPS URLs.
alter table public.entry add column photo_url text;
alter table public.entry add constraint entry_photo_url_https check (
  photo_url is null or (length(photo_url) <= 2048 and photo_url ~ '^https://[^[:space:]]+$')
);
comment on column public.entry.photo_url is 'Public profile photo URL; null displays the gray silhouette.';
