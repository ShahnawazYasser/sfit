-- Shahnawaz Fit — Supabase setup
-- Run this in the Supabase SQL editor

-- Session logs
create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  week int not null,
  day_index int not null,  -- 0=Mon ... 6=Sun
  date date not null,
  completed boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique (week, day_index)
);

-- Strength maxes log
create table if not exists maxes (
  id uuid default gen_random_uuid() primary key,
  lift text not null,  -- 'deadlift_sumo', 'squat_lowbar', 'bench'
  weight_kg numeric not null,
  is_pre_break boolean default false,
  logged_at timestamptz default now()
);

-- Daily notes / journal
create table if not exists daily_notes (
  id uuid default gen_random_uuid() primary key,
  note_date date not null unique,
  content text,
  energy_rating int,   -- 1-10
  soreness_rating int, -- 1-10
  updated_at timestamptz default now()
);

-- Row Level Security (permissive — personal app, anon key)
alter table sessions enable row level security;
alter table maxes enable row level security;
alter table daily_notes enable row level security;

create policy "Allow all" on sessions for all using (true);
create policy "Allow all" on maxes for all using (true);
create policy "Allow all" on daily_notes for all using (true);
