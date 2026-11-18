-- Carver: Social tab challenges (run after push.sql). Safe to run again.
--
-- Adds one new kind of group post, 'challenge': someone in the group starts a
-- challenge (e.g. 12 workouts in 30 days) and everyone's progress is counted from
-- the group's posts. Nothing else changes.

alter table public.carver_events drop constraint if exists carver_events_kind_check;
alter table public.carver_events add constraint carver_events_kind_check
  check (kind in ('started', 'workout', 'cardio', 'protein', 'kcal', 'week', 'photo', 'habit', 'missed', 'weekly', 'challenge'));

-- Leaderboards and challenges read a month or more of a group's posts
create index if not exists carver_events_group_time on public.carver_events (group_id, created_at desc);
