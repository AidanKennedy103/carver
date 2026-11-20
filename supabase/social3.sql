-- Carver: text posts in groups (run after social2.sql). Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
--
-- Adds one new kind of group post, 'note': a short message (up to 280 characters)
-- someone writes to the group. Members are notified like any other post.

alter table public.carver_events drop constraint if exists carver_events_kind_check;
alter table public.carver_events add constraint carver_events_kind_check
  check (kind in ('started', 'workout', 'cardio', 'protein', 'kcal', 'week', 'photo', 'habit', 'missed', 'weekly', 'challenge', 'gym', 'note'));

drop trigger if exists carver_events_notify on public.carver_events;
create trigger carver_events_notify after insert on public.carver_events
  for each row when (new.kind in ('workout', 'cardio', 'habit', 'missed', 'weekly', 'week', 'photo', 'challenge', 'gym', 'note'))
  execute function public.carver_notify();
