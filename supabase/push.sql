-- Carver: notifications and accountability (run after schema.sql and groups.sql).
-- Safe to run again.
--
-- What this adds:
--   * new group post types: a finished daily goal, a missed one, and the Monday summary
--   * carver_push: the phones that want notifications
--   * a trigger that asks the carver-push function to notify the group about each new post
--   * an hourly job that lets carver-push post missed daily goals (8 am each person's
--     time) and the Monday summaries
--
-- Deploy the function first (supabase/functions/carver-push/index.ts, see README).

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- New kinds of post ----------
alter table public.carver_events drop constraint if exists carver_events_kind_check;
alter table public.carver_events add constraint carver_events_kind_check
  check (kind in ('started', 'workout', 'cardio', 'protein', 'kcal', 'week', 'photo', 'habit', 'missed', 'weekly'));
alter table public.carver_events add column if not exists pushed_at timestamptz;   -- notified already
create index if not exists carver_events_ref on public.carver_events (user_id, ref);

-- ---------- Phones that get notifications ----------
create table if not exists public.carver_push (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.carver_push enable row level security;
drop policy if exists "push: own" on public.carver_push;
create policy "push: own" on public.carver_push for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Notify the group about each new post ----------
create or replace function public.carver_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://hfayaseunuyfxlyebwzc.supabase.co/functions/v1/carver-push',
    body := jsonb_build_object('event', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
end $$;

drop trigger if exists carver_events_notify on public.carver_events;
create trigger carver_events_notify after insert on public.carver_events
  for each row when (new.kind in ('workout', 'cardio', 'habit', 'missed', 'weekly', 'week', 'photo'))
  execute function public.carver_notify();

-- ---------- Every hour: missed daily goals and Monday summaries ----------
select cron.schedule('carver-hourly', '2 * * * *', $$
  select net.http_post(
    url := 'https://hfayaseunuyfxlyebwzc.supabase.co/functions/v1/carver-push',
    body := '{"cron": true}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb);
$$);
