-- Carver: automatic Apple Health sync (a daily Shortcut, or Health Auto Export). Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Then redeploy carver-push (it receives the data).
--
-- Each person makes a private sync key in the app. The Shortcut sends yesterday's
-- numbers with that key to carver-push, which drops them in an inbox; the app picks
-- them up next time it opens and clears them. Nobody else can read your inbox.

create table if not exists public.carver_health_keys (
  key        text primary key check (length(key) >= 24),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.carver_health_inbox (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists carver_health_inbox_user on public.carver_health_inbox (user_id, id);

alter table public.carver_health_keys  enable row level security;
alter table public.carver_health_inbox enable row level security;

drop policy if exists "health keys: own" on public.carver_health_keys;
create policy "health keys: own" on public.carver_health_keys for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only the server (carver-push) adds to the inbox; you read and clear your own
drop policy if exists "health inbox: read own"  on public.carver_health_inbox;
drop policy if exists "health inbox: clear own" on public.carver_health_inbox;
create policy "health inbox: read own"  on public.carver_health_inbox for select to authenticated using (user_id = auth.uid());
create policy "health inbox: clear own" on public.carver_health_inbox for delete to authenticated using (user_id = auth.uid());
