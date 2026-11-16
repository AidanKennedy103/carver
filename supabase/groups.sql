-- >>> CARVER GROUPS SETUP. If you can read this line, you pasted the right thing. <<<
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Run it after schema.sql. It's safe to run again.
--
-- Groups: friends who see each other's workouts and goal hits.
-- Each person picks what they share with each group.

create table if not exists public.carver_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 40),
  code       text not null unique,                       -- invite code friends type in
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.carver_members (
  group_id  uuid not null references public.carver_groups on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  name      text not null check (length(name) between 1 and 30),
  shares    jsonb not null default '{"gym": true, "workouts": true, "prs": true, "cardio": true, "protein": true, "kcal": true, "week": true}',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.carver_events (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.carver_groups on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null check (kind in ('started', 'workout', 'cardio', 'protein', 'kcal', 'week', 'photo')),
  ref        text not null,                               -- what it's about (workout id, day…): each thing posts once
  data       jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (group_id, user_id, ref)
);
create index if not exists carver_events_feed on public.carver_events (group_id, created_at desc);

-- Is the signed-in person in this group? (Runs with owner rights so the rules below don't loop.)
create or replace function public.carver_is_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.carver_members where group_id = gid and user_id = auth.uid())
$$;

alter table public.carver_groups  enable row level security;
alter table public.carver_members enable row level security;
alter table public.carver_events  enable row level security;

drop policy if exists "groups: members read" on public.carver_groups;
drop policy if exists "groups: owner renames" on public.carver_groups;
drop policy if exists "groups: owner deletes" on public.carver_groups;
create policy "groups: members read"   on public.carver_groups for select to authenticated using (public.carver_is_member(id));
create policy "groups: owner renames"  on public.carver_groups for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "groups: owner deletes"  on public.carver_groups for delete to authenticated using (created_by = auth.uid());

drop policy if exists "members: members read" on public.carver_members;
drop policy if exists "members: change own" on public.carver_members;
drop policy if exists "members: leave" on public.carver_members;
create policy "members: members read" on public.carver_members for select to authenticated using (public.carver_is_member(group_id));
create policy "members: change own"   on public.carver_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members: leave"        on public.carver_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "events: members read" on public.carver_events;
drop policy if exists "events: post own" on public.carver_events;
drop policy if exists "events: delete own" on public.carver_events;
create policy "events: members read" on public.carver_events for select to authenticated using (public.carver_is_member(group_id));
create policy "events: post own"     on public.carver_events for insert to authenticated with check (user_id = auth.uid() and public.carver_is_member(group_id));
create policy "events: delete own"   on public.carver_events for delete to authenticated using (user_id = auth.uid());

-- Make a group and join it. Returns the new group.
create or replace function public.carver_create_group(group_name text, member_name text)
returns public.carver_groups language plpgsql security definer set search_path = public as $$
declare g public.carver_groups; c text; abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  loop   -- 6 letters and numbers, leaving out ones that look alike (0/O, 1/I/L)
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.carver_groups where code = c);
  end loop;
  insert into public.carver_groups (name, code, created_by) values (trim(group_name), c, auth.uid()) returning * into g;
  insert into public.carver_members (group_id, user_id, name) values (g.id, auth.uid(), trim(member_name));
  return g;
end $$;

-- Join with an invite code. Returns the group (or an error if the code is wrong).
create or replace function public.carver_join_group(invite text, member_name text)
returns public.carver_groups language plpgsql security definer set search_path = public as $$
declare g public.carver_groups;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into g from public.carver_groups where code = upper(trim(invite));
  if g.id is null then raise exception 'No group with that code'; end if;
  insert into public.carver_members (group_id, user_id, name) values (g.id, auth.uid(), trim(member_name))
  on conflict (group_id, user_id) do nothing;
  return g;
end $$;

-- Progress photos shared to a group live at carver-photos/groups/<group id>/…
-- Members of that group can see them; only the person who shared one can delete it.
create or replace function public.carver_group_file_ok(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(path))[1] = 'groups' and exists (
    select 1 from public.carver_members
    where group_id::text = (storage.foldername(path))[2] and user_id = auth.uid())
$$;
drop policy if exists "carver group photos: members read" on storage.objects;
drop policy if exists "carver group photos: members add" on storage.objects;
drop policy if exists "carver group photos: sharer deletes" on storage.objects;
create policy "carver group photos: members read"  on storage.objects for select to authenticated using (bucket_id = 'carver-photos' and public.carver_group_file_ok(name));
create policy "carver group photos: members add"   on storage.objects for insert to authenticated with check (bucket_id = 'carver-photos' and public.carver_group_file_ok(name));
create policy "carver group photos: sharer deletes" on storage.objects for delete to authenticated using (bucket_id = 'carver-photos' and owner = auth.uid() and public.carver_group_file_ok(name));

grant execute on function public.carver_create_group(text, text) to authenticated;
grant execute on function public.carver_join_group(text, text) to authenticated;
