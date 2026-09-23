-- Current entry status, maintained manually by admins after payment confirmation.
-- Existing entry RLS allows public reads and admin-only writes.
alter table public.entry add column playing_for_money boolean not null default false;
comment on column public.entry.playing_for_money is 'Current admin-confirmed money participation; not historical payment status.';
