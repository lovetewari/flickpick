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

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
