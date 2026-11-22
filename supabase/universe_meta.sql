-- Datos personales que no son nodos ni entradas (por ahora: los textos diarios del EPUB, `key = 'dailytexts'`).
-- Privados: cada usuario solo ve sus filas (RLS).
create table if not exists public.universe_meta (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.universe_meta enable row level security;
create policy universe_meta_own on public.universe_meta for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
