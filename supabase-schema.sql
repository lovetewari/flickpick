-- ═════════════════════════════════════════════════════
--  FlickPick v2 — Paste & Run in Supabase SQL Editor
-- ═════════════════════════════════════════════════════

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text, full_name text, avatar_url text,
  created_at timestamptz default now()
);

create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  host_id uuid references profiles(id),
  host_name text not null default 'Host',
  status text not null default 'lobby',
  content_type text not null default 'all',
  content_category text not null default 'trending',
  platforms text[] not null default '{}',
  genre_filter text not null default 'All',
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id),
  name text not null,
  avatar text default '😎',
  color text default '#FF6B6B',
  is_host boolean default false,
  is_done boolean default false,
  player_order int default 0,
  session_token text unique not null,
  created_at timestamptz default now()
);

create table if not exists swipes (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references players(id) on delete cascade not null,
  room_id uuid references rooms(id) on delete cascade not null,
  content_id int not null,
  content_type text default 'movie',
  liked boolean not null,
  created_at timestamptz default now(),
  unique(player_id, content_id)
);

create table if not exists watch_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  room_code text, content_id int, content_type text default 'movie',
  title text, poster_path text, was_match boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_players_room on players(room_id);
create index if not exists idx_players_session on players(session_token);
create index if not exists idx_swipes_room on swipes(room_id);
create index if not exists idx_history_user on watch_history(user_id);

alter table profiles enable row level security;
alter table rooms enable row level security;
alter table players enable row level security;
alter table swipes enable row level security;
alter table watch_history enable row level security;

drop policy if exists "p1" on profiles;
drop policy if exists "p2" on rooms;
drop policy if exists "p3" on players;
drop policy if exists "p4" on swipes;
drop policy if exists "p5" on watch_history;
create policy "p1" on profiles for all using (true) with check (true);
create policy "p2" on rooms for all using (true) with check (true);
create policy "p3" on players for all using (true) with check (true);
create policy "p4" on swipes for all using (true) with check (true);
create policy "p5" on watch_history for all using (true) with check (true);

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url) values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture','')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Idempotent publication setup (safe on re-run)
do $$ begin
  alter publication supabase_realtime add table rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null; end $$;

-- ═════════════════════════════════════════════════════
--  v3 — Own content catalog + host-selectable deck sizes
--  (idempotent: safe to re-run on an existing project)
-- ═════════════════════════════════════════════════════

-- Our own movie/series catalog, seeded by scripts/seed-catalog.mjs.
-- id convention: movies use tmdb_id; series use tmdb_id + 100000000
-- (offset far above any TMDB id, so the two can never collide).
create table if not exists catalog (
  id int primary key,
  tmdb_id int not null,
  type text not null check (type in ('movie','series')),
  title text not null,
  year int,
  release_date date,
  genres text[] not null default '{}',
  rating numeric(3,1) not null default 0,
  votes int not null default 0,
  popularity numeric not null default 0,
  hit_score numeric not null default 0,      -- rating × log10(votes+1), precomputed at seed time
  poster_path text not null,
  overview text not null default '',
  duration text not null default '',         -- "2h 10m" / "3 Seasons"
  seasons int not null default 0,
  episodes int not null default 0,
  status text not null default '',
  network text not null default '',
  providers text[] not null default '{}',
  provider_logos text[] not null default '{}',   -- official logo URL per provider (aligned with providers)
  updated_at timestamptz default now(),
  unique(tmdb_id, type)
);
alter table catalog add column if not exists provider_logos text[] not null default '{}';

create index if not exists idx_catalog_type_pop on catalog(type, popularity desc);
create index if not exists idx_catalog_type_release on catalog(type, release_date desc);
create index if not exists idx_catalog_type_hit on catalog(type, hit_score desc);
create index if not exists idx_catalog_type_rating on catalog(type, rating desc);

alter table catalog enable row level security;
drop policy if exists "catalog_read" on catalog;
create policy "catalog_read" on catalog for select using (true);
-- No insert/update policy on purpose: writes go through the seed script,
-- which uses the service-role key (bypasses RLS).

-- Host-selected deck sizes
alter table rooms add column if not exists movie_count int not null default 20;
alter table rooms add column if not exists series_count int not null default 20;

-- The frozen deck for a game: full item objects, persisted at "Start swiping".
-- Every player (and every rejoin/results reload) reads THIS, never a live
-- rebuild — so all players always hold the identical deck.
alter table rooms add column if not exists deck jsonb;

-- Subscription-ready: which plan a user is on ('free' today; a billing
-- integration can later set 'plus'). All limits live in src/lib/plans.js.
alter table profiles add column if not exists plan text not null default 'free';

-- One-time migration: series ids from the old TMDB-era offset (+200,000)
-- to the new one (+100,000,000). Safe to re-run — migrated rows no longer
-- match the WHERE clause. Movie rows are untouched (content_type filter).
update swipes set content_id = content_id - 200000 + 100000000
  where content_type = 'series' and content_id between 200000 and 99999999;
update watch_history set content_id = content_id - 200000 + 100000000
  where content_type = 'series' and content_id between 200000 and 99999999;
