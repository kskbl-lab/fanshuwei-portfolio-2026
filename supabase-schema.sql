create table if not exists public.portfolio_state (
  id text primary key,
  projects jsonb not null default '[]'::jsonb,
  core_items jsonb not null default '[]'::jsonb,
  media jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_state enable row level security;

drop policy if exists "portfolio_state_public_read" on public.portfolio_state;
drop policy if exists "portfolio_state_public_insert" on public.portfolio_state;
drop policy if exists "portfolio_state_public_update" on public.portfolio_state;

create policy "portfolio_state_public_read"
on public.portfolio_state
for select
using (true);

create policy "portfolio_state_public_insert"
on public.portfolio_state
for insert
with check (id = 'main');

create policy "portfolio_state_public_update"
on public.portfolio_state
for update
using (id = 'main')
with check (id = 'main');

insert into public.portfolio_state (id)
values ('main')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = true;

drop policy if exists "portfolio_media_public_read" on storage.objects;
drop policy if exists "portfolio_media_public_insert" on storage.objects;
drop policy if exists "portfolio_media_public_update" on storage.objects;
drop policy if exists "portfolio_media_public_delete" on storage.objects;

create policy "portfolio_media_public_read"
on storage.objects
for select
using (bucket_id = 'portfolio-media');

create policy "portfolio_media_public_insert"
on storage.objects
for insert
with check (bucket_id = 'portfolio-media');

create policy "portfolio_media_public_update"
on storage.objects
for update
using (bucket_id = 'portfolio-media')
with check (bucket_id = 'portfolio-media');

create policy "portfolio_media_public_delete"
on storage.objects
for delete
using (bucket_id = 'portfolio-media');
