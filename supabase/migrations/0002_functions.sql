-- Auth → public.users mirror
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seasons the current user is an approved member of (SECURITY DEFINER to dodge RLS recursion)
create or replace function public.approved_season_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select season_id from public.season_members
  where user_id = auth.uid() and status = 'approved'
$$;

create or replace function public.admin_season_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from public.seasons where admin_id = auth.uid()
$$;

-- Ledger-derived balance
create or replace function public.member_balance(p_member uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0)::int from public.ledger where member_id = p_member
$$;

-- Ownership guard: service role (auth.uid() null) always passes.
create or replace function public.assert_owner(p_member uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is not null and not exists (
    select 1 from public.season_members where id = p_member and user_id = v_uid
  ) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
end; $$;

-- ── Atomic offer purchase (handles every offer type) ────────────────────────
create or replace function public.buy_offer(
  p_member uuid, p_offer uuid, p_lots numeric default null,
  p_amount int default null, p_entry_price numeric default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  o public.market_offers;
  v_cost int;
  v_fee int := 0;
  v_bal int;
  v_pos uuid;
  v_ledger_type text;
  v_need int;
begin
  perform public.assert_owner(p_member);
  select * into o from public.market_offers where id = p_offer for update;
  if not found or not o.active then raise exception 'offer_unavailable'; end if;
  if o.expires_at is not null and o.expires_at < now() then raise exception 'offer_expired'; end if;

  if o.type = 'interest' then
    v_cost := coalesce(p_amount, 0);
    if v_cost < coalesce(o.min_stake, 1) then raise exception 'below_min_stake'; end if;
    v_ledger_type := 'deposit_open';
  elsif o.type in ('crypto','stock','fx','fund') then
    if p_lots is null or p_entry_price is null then raise exception 'missing_price'; end if;
    if o.stock is not null and ceil(p_lots) > o.stock then raise exception 'insufficient_stock'; end if;
    v_cost := round(p_lots * p_entry_price)::int;
    v_fee := floor(v_cost * 0.01)::int;
    v_ledger_type := 'market_buy';
  else -- real_estate / car / watch
    if o.stock is not null and o.stock < 1 then raise exception 'insufficient_stock'; end if;
    v_cost := o.price_per_lot;
    v_ledger_type := 'market_buy';
  end if;

  v_need := v_cost + v_fee;
  v_bal := public.member_balance(p_member);
  if v_bal < v_need then raise exception 'insufficient_balance'; end if;

  -- decrement stock / close single-unit offers
  if o.type in ('crypto','stock','fx','fund') and o.stock is not null then
    update public.market_offers set stock = stock - ceil(p_lots),
      active = case when stock - ceil(p_lots) <= 0 then false else active end
      where id = o.id;
  elsif o.type in ('real_estate','car','watch') then
    update public.market_offers set stock = 0, active = false where id = o.id;
  end if;

  insert into public.ledger(member_id, season_id, type, amount, description, ref_type, ref_id)
    values (p_member, o.season_id, v_ledger_type, -v_need, o.title, 'offer', o.id);

  insert into public.positions(
    member_id, season_id, offer_id, type, title, instrument_id, symbol,
    amount_klr, lots, leverage, entry_price, rate, rent_per_day, lock_end, status
  ) values (
    p_member, o.season_id, o.id, o.type, o.title, o.instrument_id, o.symbol,
    v_cost, p_lots, o.leverage, p_entry_price, o.rate, o.rent_per_day,
    case when o.type='interest' then now() + make_interval(hours => o.lock_hours) else null end,
    'open'
  ) returning id into v_pos;

  return v_pos;
end; $$;

-- ── Sell a position immediately at a server-computed value ──────────────────
create or replace function public.sell_position(p_member uuid, p_position uuid, p_value int)
returns int language plpgsql security definer set search_path = public as $$
declare p public.positions;
begin
  perform public.assert_owner(p_member);
  select * into p from public.positions where id = p_position for update;
  if not found or p.member_id <> p_member then raise exception 'not_found'; end if;
  if p.status <> 'open' then raise exception 'not_open'; end if;

  insert into public.ledger(member_id, season_id, type, amount, description, ref_type, ref_id)
    values (p_member, p.season_id, 'market_sell', greatest(0, p_value), coalesce(p.title,'Satış'), 'position', p.id);
  update public.positions
    set status = case when p_value <= 0 then 'liquidated' else 'closed' end,
        closed_value = greatest(0, p_value), closed_at = now()
    where id = p.id;
  return greatest(0, p_value);
end; $$;

-- ── List an asset for sale (settles in 24h via cron) ────────────────────────
create or replace function public.list_position(p_member uuid, p_position uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.positions;
begin
  perform public.assert_owner(p_member);
  select * into p from public.positions where id = p_position for update;
  if not found or p.member_id <> p_member or p.status <> 'open' then raise exception 'not_listable'; end if;
  update public.positions set status = 'listed', list_end = now() + interval '24 hours' where id = p.id;
end; $$;

-- ── Sit at a casino table ───────────────────────────────────────────────────
create or replace function public.casino_sit(p_member uuid, p_stake int, p_hours int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_bal int; v_id uuid;
begin
  perform public.assert_owner(p_member);
  if p_hours not in (1,2,3,6) then raise exception 'bad_duration'; end if;
  if p_stake <= 0 then raise exception 'bad_stake'; end if;
  v_bal := public.member_balance(p_member);
  if v_bal < p_stake then raise exception 'insufficient_balance'; end if;

  insert into public.ledger(member_id, season_id, type, amount, description, ref_type)
    select p_member, m.season_id, 'casino_stake', -p_stake, 'Kumarhane masası', 'casino'
    from public.season_members m where m.id = p_member;

  insert into public.casino_sessions(member_id, season_id, stake, hours, end_at, status)
    select p_member, m.season_id, p_stake, p_hours, now() + make_interval(hours => p_hours), 'active'
    from public.season_members m where m.id = p_member
    returning id into v_id;
  return v_id;
end; $$;
