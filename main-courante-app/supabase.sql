-- Main courante : base de données
-- À coller dans Supabase > SQL Editor > New query, puis "Run".

create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mod         text not null check (mod in ('travail','fac','sport','budget')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists entries_user_idx on public.entries (user_id, created_at);

-- Sécurité : chaque compte ne voit et ne modifie QUE ses propres entrées.
alter table public.entries enable row level security;

drop policy if exists "lire ses entrees"      on public.entries;
drop policy if exists "ajouter ses entrees"   on public.entries;
drop policy if exists "modifier ses entrees"  on public.entries;
drop policy if exists "supprimer ses entrees" on public.entries;

create policy "lire ses entrees"      on public.entries for select using (auth.uid() = user_id);
create policy "ajouter ses entrees"   on public.entries for insert with check (auth.uid() = user_id);
create policy "modifier ses entrees"  on public.entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supprimer ses entrees" on public.entries for delete using (auth.uid() = user_id);

-- Synchro en direct entre le téléphone et l'ordi.
alter publication supabase_realtime add table public.entries;
