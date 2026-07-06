-- Kilorin core schema. KLR balances are ALWAYS derived from the ledger; no table
-- stores a mutable balance column.
create extension if not exists pgcrypto;

-- ── users (mirror of auth.users) ────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ── seasons ─────────────────────────────────────────────────────────────────
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  admin_id uuid not null references public.users(id),
  length_weeks int not null default 12 check (length_weeks between 8 and 24),
  weigh_days text[] not null default array['Pzt','Per'],
  start_date date not null default (now() at time zone 'Europe/Istanbul')::date,
  status text not null default 'active' check (status in ('draft','active','ended')),
  next_showcase_at timestamptz not null default now(),
  offer_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── season_members ──────────────────────────────────────────────────────────
create table public.season_members (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_admin boolean not null default false,
  height_cm numeric(5,1),
  age int,
  sex text check (sex in ('male','female')),
  activity_factor numeric(4,3),
  start_kg numeric(5,1),
  target_kg numeric(5,1),
  current_kg numeric(5,1),
  daily_target_kcal int,
  maintenance_kcal int,
  streak_days int not null default 0,
  shield_inventory int not null default 0,
  suspicious boolean not null default false,
  cheat_day_last date,
  ai_avatar_url text,
  cosmetics jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  unique (season_id, user_id)
);

-- ── daily_logs ──────────────────────────────────────────────────────────────
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  log_date date not null,
  breakfast_kcal int not null default 0 check (breakfast_kcal >= 0),
  lunch_kcal int not null default 0 check (lunch_kcal >= 0),
  dinner_kcal int not null default 0 check (dinner_kcal >= 0),
  snack_kcal int not null default 0 check (snack_kcal >= 0),
  breakfast_photo text,
  lunch_photo text,
  dinner_photo text,
  snack_photo text,
  is_dessert_log boolean not null default false,
  cheat_day boolean not null default false,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, log_date)
);

-- ── ledger (single source of truth for balances) ────────────────────────────
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  type text not null,
  amount int not null,
  description text,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index ledger_member_idx on public.ledger(member_id);

create view public.member_balances as
  select m.id as member_id,
         coalesce(sum(l.amount), 0)::int as balance
  from public.season_members m
  left join public.ledger l on l.member_id = m.id
  group by m.id;

-- ── weigh_ins ───────────────────────────────────────────────────────────────
create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  weigh_date date not null,
  weight_kg numeric(5,1) not null,
  photo_path text,
  expected_kg numeric(5,1),
  reward_given boolean not null default false,
  admin_rejected boolean not null default false,
  suspicion jsonb,
  created_at timestamptz not null default now(),
  unique (member_id, weigh_date)
);

-- ── market_offers ───────────────────────────────────────────────────────────
create table public.market_offers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  type text not null check (type in ('interest','crypto','stock','fx','fund','real_estate','car','watch')),
  title text not null,
  subtitle text,
  instrument_id text,
  symbol text,
  lock_hours int,
  rate numeric(6,4),
  is_trap boolean not null default false,
  leverage numeric(5,2),
  price_per_lot int not null default 0,
  stock int,
  min_stake int,
  rent_per_day int,
  terms jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  spawn_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index market_offers_season_idx on public.market_offers(season_id, active);

-- ── positions (owned assets) ────────────────────────────────────────────────
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  offer_id uuid references public.market_offers(id),
  type text not null,
  title text,
  instrument_id text,
  symbol text,
  amount_klr int not null,            -- stake / principal / purchase price
  lots numeric(10,4),
  leverage numeric(5,2),
  entry_price numeric(20,8),
  rate numeric(6,4),
  rent_per_day int,
  lock_end timestamptz,
  list_end timestamptz,               -- when a listed sale settles
  status text not null default 'open' check (status in ('open','closed','liquidated','listed','matured')),
  closed_value int,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index positions_member_idx on public.positions(member_id, status);

-- ── casino_sessions ─────────────────────────────────────────────────────────
create table public.casino_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  stake int not null check (stake > 0),
  hours int not null check (hours in (1,2,3,6)),
  end_at timestamptz not null,
  result_multiplier numeric(5,2),
  payout int,
  percentile int,
  status text not null default 'active' check (status in ('active','revealed','collected')),
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);
create index casino_active_idx on public.casino_sessions(status, end_at);

-- ── shop ────────────────────────────────────────────────────────────────────
create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  emoji text,
  price int not null,
  category text not null default 'cosmetic',
  active boolean not null default true,
  sort int not null default 0
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  item_id uuid not null references public.shop_items(id),
  item_key text not null,
  price int not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── dessert_bombs ───────────────────────────────────────────────────────────
create table public.dessert_bombs (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  attacker_member_id uuid not null references public.season_members(id) on delete cascade,
  target_member_id uuid not null references public.season_members(id) on delete cascade,
  deadline timestamptz not null,
  status text not null default 'pending' check (status in ('pending','fulfilled','expired')),
  created_at timestamptz not null default now()
);
create index dessert_bomb_status_idx on public.dessert_bombs(status, deadline);

-- ── notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.season_members(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_member_idx on public.notifications(member_id, read);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
