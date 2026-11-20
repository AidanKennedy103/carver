-- Carver: emoji reactions on group posts (run after social2.sql). Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
--
-- Reactions used to be one "kudos" per person. Now each person can add any of
-- six emojis to a post (one of each). Old kudos stay and show as a clap.

alter table public.carver_reactions drop constraint if exists carver_reactions_kind_check;
alter table public.carver_reactions add constraint carver_reactions_kind_check
  check (kind in ('kudos', 'fire', 'strong', 'clap', 'heart', 'laugh', 'wow'));

-- The notification says which emoji
create or replace function public.carver_notify_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://hfayaseunuyfxlyebwzc.supabase.co/functions/v1/carver-push',
    body := jsonb_build_object('reply', jsonb_build_object('table', tg_table_name, 'event', new.event_id, 'user', new.user_id,
      'text', case when tg_table_name = 'carver_comments' then new.body else null end,
      'kind', case when tg_table_name = 'carver_reactions' then new.kind else null end)),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
end $$;
