-- >>> CARVER DATABASE SETUP. If you can read this line, you pasted the right thing. <<<
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It's safe to run again.

-- ============================================================
-- 1. Each account's data (workouts, food, weights, goals…)
--    One row per person. The app merges changes from each device.
-- ============================================================
create table if not exists public.carver_state (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  rev        integer not null default 1,     -- goes up by one on every save, so two devices never overwrite each other
  updated_at timestamptz not null default now()
);
alter table public.carver_state enable row level security;

drop policy if exists "own state: read" on public.carver_state;
drop policy if exists "own state: add" on public.carver_state;
drop policy if exists "own state: change" on public.carver_state;
drop policy if exists "own state: delete" on public.carver_state;
create policy "own state: read"   on public.carver_state for select to authenticated using (user_id = auth.uid());
create policy "own state: add"    on public.carver_state for insert to authenticated with check (user_id = auth.uid());
create policy "own state: change" on public.carver_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own state: delete" on public.carver_state for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 2. Shared food database: foods anyone signed in adds or scans
-- ============================================================
create table if not exists public.carver_foods (
  id         text primary key,
  barcode    text,
  name       text not null check (length(name) between 1 and 120),
  data       jsonb not null,                                  -- the food: servings, nutrients per 100 g, icon…
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  -- Beta: new foods show up for everyone straight away.
  -- To review foods first, change the default to false and approve them in the Table Editor.
  approved   boolean not null default true
);
create index if not exists carver_foods_barcode on public.carver_foods (barcode);
alter table public.carver_foods enable row level security;

drop policy if exists "foods: read approved or own" on public.carver_foods;
drop policy if exists "foods: add when signed in" on public.carver_foods;
drop policy if exists "foods: edit own" on public.carver_foods;
drop policy if exists "foods: delete own" on public.carver_foods;
create policy "foods: read approved or own" on public.carver_foods for select to anon, authenticated using (approved or created_by = auth.uid());
create policy "foods: add when signed in"   on public.carver_foods for insert to authenticated with check (created_by = auth.uid());
create policy "foods: edit own"             on public.carver_foods for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "foods: delete own"           on public.carver_foods for delete to authenticated using (created_by = auth.uid());

-- The app may only send these columns, so only you (in the dashboard) can mark a food approved.
revoke insert, update on public.carver_foods from anon, authenticated;
grant insert (id, barcode, name, data) on public.carver_foods to authenticated;
grant update (barcode, name, data) on public.carver_foods to authenticated;

-- ============================================================
-- 3. Progress photos (private: only you can see yours)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('carver-photos', 'carver-photos', false)
on conflict (id) do nothing;

drop policy if exists "carver photos: read own" on storage.objects;
drop policy if exists "carver photos: add own" on storage.objects;
drop policy if exists "carver photos: change own" on storage.objects;
drop policy if exists "carver photos: delete own" on storage.objects;
create policy "carver photos: read own"   on storage.objects for select to authenticated using (bucket_id = 'carver-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "carver photos: add own"    on storage.objects for insert to authenticated with check (bucket_id = 'carver-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "carver photos: change own" on storage.objects for update to authenticated using (bucket_id = 'carver-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "carver photos: delete own" on storage.objects for delete to authenticated using (bucket_id = 'carver-photos' and (storage.foldername(name))[1] = auth.uid()::text);
