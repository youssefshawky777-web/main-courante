-- Main courante v2 : pages personnalisables + photos de tickets
-- À exécuter UNE SEULE FOIS : Supabase > SQL Editor > New query > colle tout > Run.
-- Tes entrées existantes ne sont pas touchées. Relancer le script ne casse rien.

-- 1. Les entrées peuvent maintenant appartenir à n'importe quelle page
alter table public.entries drop constraint if exists entries_mod_check;
create index if not exists entries_mod_idx on public.entries (user_id, mod);

-- 2. Table des pages (onglets) : nom, couleur, ordre, champs du formulaire, réglages
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug        text not null,
  name        text not null,
  color       text not null default 'gris',
  position    integer not null default 0,
  template    text not null default 'journal' check (template in ('journal','taches','argent','habitude')),
  fields      jsonb not null default '[]'::jsonb,
  settings    jsonb not null default '{}'::jsonb,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.pages enable row level security;

drop policy if exists "lire ses pages"      on public.pages;
drop policy if exists "ajouter ses pages"   on public.pages;
drop policy if exists "modifier ses pages"  on public.pages;
drop policy if exists "supprimer ses pages" on public.pages;

create policy "lire ses pages"      on public.pages for select using (auth.uid() = user_id);
create policy "ajouter ses pages"   on public.pages for insert with check (auth.uid() = user_id);
create policy "modifier ses pages"  on public.pages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supprimer ses pages" on public.pages for delete using (auth.uid() = user_id);

-- Synchro en direct des pages entre téléphone et ordi
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pages'
  ) then
    alter publication supabase_realtime add table public.pages;
  end if;
end $$;

-- 3. Photos de tickets : espace de stockage privé (10 Mo max par photo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tickets', 'tickets', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

-- Chaque compte ne voit que les photos rangées dans SON dossier (nommé avec son identifiant)
drop policy if exists "tickets lire"      on storage.objects;
drop policy if exists "tickets ajouter"   on storage.objects;
drop policy if exists "tickets modifier"  on storage.objects;
drop policy if exists "tickets supprimer" on storage.objects;

create policy "tickets lire" on storage.objects for select to authenticated
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tickets ajouter" on storage.objects for insert to authenticated
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tickets modifier" on storage.objects for update to authenticated
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tickets supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);
