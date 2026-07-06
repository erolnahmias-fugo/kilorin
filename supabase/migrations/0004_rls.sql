-- Balances view respects the caller's RLS (so it only ever returns own rows).
alter view public.member_balances set (security_invoker = on);

alter table public.users            enable row level security;
alter table public.seasons          enable row level security;
alter table public.season_members   enable row level security;
alter table public.daily_logs       enable row level security;
alter table public.ledger           enable row level security;
alter table public.weigh_ins        enable row level security;
alter table public.market_offers    enable row level security;
alter table public.positions        enable row level security;
alter table public.casino_sessions  enable row level security;
alter table public.shop_items       enable row level security;
alter table public.purchases        enable row level security;
alter table public.dessert_bombs    enable row level security;
alter table public.notifications    enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper: member ids owned by the caller.
create or replace function public.my_member_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from public.season_members where user_id = auth.uid()
$$;

-- Helper: member ids visible to the caller (everyone in seasons they're approved in).
create or replace function public.visible_member_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from public.season_members where season_id in (select public.approved_season_ids())
$$;

-- users
create policy users_select on public.users for select to authenticated using (
  id = auth.uid()
  or id in (select user_id from public.season_members where season_id in (select public.approved_season_ids()))
);
create policy users_update on public.users for update to authenticated using (id = auth.uid());

-- seasons
create policy seasons_select on public.seasons for select to authenticated using (
  id in (select public.approved_season_ids())
  or admin_id = auth.uid()
  or id in (select season_id from public.season_members where user_id = auth.uid())
);
create policy seasons_insert on public.seasons for insert to authenticated with check (admin_id = auth.uid());
create policy seasons_update on public.seasons for update to authenticated using (admin_id = auth.uid());

-- season_members
create policy members_select on public.season_members for select to authenticated using (
  season_id in (select public.approved_season_ids())
  or user_id = auth.uid()
  or season_id in (select public.admin_season_ids())
);
create policy members_insert on public.season_members for insert to authenticated with check (user_id = auth.uid());
create policy members_update on public.season_members for update to authenticated using (
  user_id = auth.uid() or season_id in (select public.admin_season_ids())
);

-- daily_logs (photos are group-visible)
create policy logs_select on public.daily_logs for select to authenticated using (
  member_id in (select public.visible_member_ids())
);
create policy logs_write on public.daily_logs for insert to authenticated with check (
  member_id in (select public.my_member_ids())
);
create policy logs_update on public.daily_logs for update to authenticated using (
  member_id in (select public.my_member_ids())
);

-- ledger (private to owner)
create policy ledger_select on public.ledger for select to authenticated using (
  member_id in (select public.my_member_ids())
);

-- weigh_ins (group-visible, owner-writable)
create policy weighins_select on public.weigh_ins for select to authenticated using (
  member_id in (select public.visible_member_ids())
);
create policy weighins_write on public.weigh_ins for insert to authenticated with check (
  member_id in (select public.my_member_ids())
);
create policy weighins_update on public.weigh_ins for update to authenticated using (
  member_id in (select public.my_member_ids())
  or member_id in (select id from public.season_members where season_id in (select public.admin_season_ids()))
);

-- market_offers (season-visible, read-only for clients)
create policy offers_select on public.market_offers for select to authenticated using (
  season_id in (select public.approved_season_ids())
);

-- positions / casino / purchases (private to owner)
create policy positions_select on public.positions for select to authenticated using (
  member_id in (select public.my_member_ids())
);
create policy casino_select on public.casino_sessions for select to authenticated using (
  member_id in (select public.my_member_ids())
);
create policy purchases_select on public.purchases for select to authenticated using (
  member_id in (select public.my_member_ids())
);

-- shop_items (public catalog to any signed-in user)
create policy shop_select on public.shop_items for select to authenticated using (true);

-- dessert_bombs (attacker, target, or season admin)
create policy bombs_select on public.dessert_bombs for select to authenticated using (
  attacker_member_id in (select public.my_member_ids())
  or target_member_id in (select public.my_member_ids())
  or season_id in (select public.admin_season_ids())
);

-- notifications (owner)
create policy notif_select on public.notifications for select to authenticated using (
  member_id in (select public.my_member_ids())
);
create policy notif_update on public.notifications for update to authenticated using (
  member_id in (select public.my_member_ids())
);

-- push_subscriptions (owner)
create policy push_all on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
