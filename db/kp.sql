-- Knowledge point (KP) events + aggregated stats
-- Apply to Supabase Postgres (SQL editor / migration tool)

create table if not exists kp_events (
  id uuid primary key default gen_random_uuid(),
  kid_user_id uuid not null references kid_users(id) on delete cascade,
  unit_id text not null,
  run_id uuid not null references quiz_runs(id) on delete cascade,
  question_id text not null,
  kp_id text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_kp_events_user_unit on kp_events (kid_user_id, unit_id);
create index if not exists idx_kp_events_user_kp on kp_events (kid_user_id, kp_id);
create index if not exists idx_kp_events_run on kp_events (run_id);
create index if not exists idx_kp_events_created_at on kp_events (created_at);

create table if not exists kp_stats (
  kid_user_id uuid not null references kid_users(id) on delete cascade,
  unit_id text not null,
  kp_id text not null,
  seen_count int not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  mastery_score int not null default 0,
  last_seen_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (kid_user_id, unit_id, kp_id)
);

create index if not exists idx_kp_stats_user_unit on kp_stats (kid_user_id, unit_id);
create index if not exists idx_kp_stats_user_kp on kp_stats (kid_user_id, kp_id);

-- Detective growth profile (XP + rank)
create table if not exists kid_growth (
  kid_user_id uuid primary key references kid_users(id) on delete cascade,
  xp int not null default 0,
  level int not null default 1,
  title text not null default '新手探员',
  updated_at timestamptz not null default now()
);

