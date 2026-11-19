-- Carver: kudos, comments and "heading to the gym" (run after social.sql). Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
--
--   carver_reactions: one kudos per person per post
--   carver_comments:  short comments on a post
--   'gym' posts:      "Heading to the gym at 6 pm", which notifies the group
-- Only members of the post's group can see, give or remove them. The post's owner
-- gets a notification for each kudos and comment (through carver-push).

alter table public.carver_events drop constraint if exists carver_events_kind_check;
alter table public.carver_events add constraint carver_events_kind_check
  check (kind in ('started', 'workout', 'cardio', 'protein', 'kcal', 'week', 'photo', 'habit', 'missed', 'weekly', 'challenge', 'gym'));

-- Is the signed-in person in the group this post belongs to?
create or replace function public.carver_can_see_event(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.carver_events e join public.carver_members m on m.group_id = e.group_id
                 where e.id = eid and m.user_id = auth.uid())
$$;

create table if not exists public.carver_reactions (
  event_id   uuid not null references public.carver_events on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null default 'kudos' check (kind in ('kudos')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id, kind)
);
create table if not exists public.carver_comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.carver_events on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  body       text not null check (length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists carver_comments_event on public.carver_comments (event_id, created_at);

alter table public.carver_reactions enable row level security;
alter table public.carver_comments  enable row level security;

drop policy if exists "reactions: members read" on public.carver_reactions;
drop policy if exists "reactions: give own"     on public.carver_reactions;
drop policy if exists "reactions: remove own"   on public.carver_reactions;
create policy "reactions: members read" on public.carver_reactions for select to authenticated using (public.carver_can_see_event(event_id));
create policy "reactions: give own"     on public.carver_reactions for insert to authenticated with check (user_id = auth.uid() and public.carver_can_see_event(event_id));
create policy "reactions: remove own"   on public.carver_reactions for delete to authenticated using (user_id = auth.uid());

drop policy if exists "comments: members read" on public.carver_comments;
drop policy if exists "comments: post own"     on public.carver_comments;
drop policy if exists "comments: delete own"   on public.carver_comments;
create policy "comments: members read" on public.carver_comments for select to authenticated using (public.carver_can_see_event(event_id));
create policy "comments: post own"     on public.carver_comments for insert to authenticated with check (user_id = auth.uid() and public.carver_can_see_event(event_id));
create policy "comments: delete own"   on public.carver_comments for delete to authenticated using (user_id = auth.uid());

-- Notifications: the post's owner hears about kudos and comments; the group hears about gym plans
create or replace function public.carver_notify_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://hfayaseunuyfxlyebwzc.supabase.co/functions/v1/carver-push',
    body := jsonb_build_object('reply', jsonb_build_object('table', tg_table_name, 'event', new.event_id, 'user', new.user_id, 'text', case when tg_table_name = 'carver_comments' then new.body else null end)),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
end $$;

drop trigger if exists carver_reactions_notify on public.carver_reactions;
create trigger carver_reactions_notify after insert on public.carver_reactions for each row execute function public.carver_notify_reply();
drop trigger if exists carver_comments_notify on public.carver_comments;
create trigger carver_comments_notify after insert on public.carver_comments for each row execute function public.carver_notify_reply();

drop trigger if exists carver_events_notify on public.carver_events;
create trigger carver_events_notify after insert on public.carver_events
  for each row when (new.kind in ('workout', 'cardio', 'habit', 'missed', 'weekly', 'week', 'photo', 'challenge', 'gym'))
  execute function public.carver_notify();
