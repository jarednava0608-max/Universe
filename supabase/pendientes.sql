-- Pendientes (fusión con Centro). Ya está aplicado en el proyecto "Memoria Bíblica" (migración `pendientes`).
-- Los pendientes y hábitos viven en `universe_entries` (kind 'pendiente' / 'habito'); aquí solo va lo del servidor.
-- Para deshacerlo: select cron.unschedule('pendientes-push'); drop function public.pendientes_tick();
--   drop function public.pendiente_nuevo(text, timestamptz, integer, text, text, text, text, text);
--   drop table public.universe_push_log; drop table public.universe_intake;

-- Avisos ya mandados (para no mandar uno dos veces). Solo la usa la función pendientes-push.
create table if not exists public.universe_push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.universe_push_log enable row level security; -- sin políticas: nadie desde la app

-- Claves para agregar pendientes desde ChatGPT u otra app (función pendientes-intake). Se guarda el SHA-256, no la clave.
create table if not exists public.universe_intake (
  name text primary key,
  key_hash text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.universe_intake enable row level security; -- sin políticas: nadie desde la app

-- Cada minuto: si alguien tiene prendidos los avisos de Pendientes, llama a la función.
create or replace function public.pendientes_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.universe_entries
    where id = 'pendientes-ajustes' and not deleted and fields ->> 'avisos' = 'true'
  ) then
    perform net.http_post(
      url := 'https://jikonxuznepdyhcjyysh.supabase.co/functions/v1/pendientes-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  end if;
end;
$$;
revoke execute on function public.pendientes_tick() from public, anon, authenticated;

-- Para que Claude (con el conector de Supabase) agregue un pendiente con una sola línea:
--   select public.pendiente_nuevo('Entregar ensayo', '2026-11-19 23:55-06', 1440, 'Universidad', 'Alta');
-- Argumentos: título, fecha y hora (con zona), minutos antes del aviso (null = sin aviso),
-- categoría, prioridad, tipo ('Tarea' | 'Evento' | 'Recordatorio'), notas, quién lo agregó.
create or replace function public.pendiente_nuevo(
  p_titulo text,
  p_fecha timestamptz default null,
  p_aviso_min integer default 0,
  p_categoria text default 'Personal',
  p_prioridad text default 'Media',
  p_tipo text default 'Tarea',
  p_notas text default '',
  p_fuente text default 'Claude'
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
  ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  new_id text := 'p-' || to_hex(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) || '-' || substr(md5(random()::text), 1, 5);
begin
  select user_id into owner from public.universe_intake order by created_at limit 1;
  if owner is null then
    raise exception 'Falta la fila de universe_intake (dueño de los pendientes)';
  end if;
  insert into public.universe_entries (user_id, id, kind, fields, created_at, updated_at)
  values (owner, new_id, 'pendiente', jsonb_build_object(
    'title', p_titulo,
    'dueAt', case when p_fecha is null then null else to_char(p_fecha at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'category', p_categoria,
    'priority', p_prioridad,
    'type', p_tipo,
    'repeat', 'none',
    'reminderMinutes', case when p_fecha is null then null else p_aviso_min end,
    'notes', coalesce(p_notas, ''),
    'source', p_fuente,
    'done', false
  ), ms, ms);
  return new_id;
end;
$$;
revoke execute on function public.pendiente_nuevo(text, timestamptz, integer, text, text, text, text, text) from public, anon, authenticated;

-- El cron (cada minuto; la función no hace nada si los avisos están apagados).
select cron.schedule('pendientes-push', '* * * * *', 'select public.pendientes_tick()');
