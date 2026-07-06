-- ── Atomic shop purchase with per-item effects ──────────────────────────────
create or replace function public.shop_purchase(p_member uuid, p_item_key text, p_meta jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  it public.shop_items;
  m public.season_members;
  v_bal int;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_ledger_type text := 'shop_purchase';
  v_target uuid;
  v_purchase uuid;
begin
  perform public.assert_owner(p_member);
  select * into it from public.shop_items where key = p_item_key and active;
  if not found then raise exception 'item_unavailable'; end if;
  select * into m from public.season_members where id = p_member for update;

  v_bal := public.member_balance(p_member);
  if v_bal < it.price then raise exception 'insufficient_balance'; end if;

  if it.key = 'streak_shield' then
    if m.shield_inventory >= 2 then raise exception 'shield_full'; end if;
    update public.season_members set shield_inventory = shield_inventory + 1 where id = p_member;

  elsif it.key = 'cheat_day' then
    if m.cheat_day_last is not null and m.cheat_day_last >= date_trunc('week', v_today::timestamp)::date then
      raise exception 'cheat_used';
    end if;
    update public.season_members set cheat_day_last = v_today where id = p_member;
    insert into public.daily_logs(member_id, log_date, cheat_day)
      values (p_member, v_today, true)
      on conflict (member_id, log_date) do update set cheat_day = true;

  elsif it.key = 'dessert_bomb' then
    v_ledger_type := 'dessert_bomb_stake';
    v_target := nullif(p_meta->>'target_member_id','')::uuid;
    if v_target is null or v_target = p_member then raise exception 'bad_target'; end if;
    if not exists (select 1 from public.season_members t
                   where t.id = v_target and t.season_id = m.season_id and t.status='approved') then
      raise exception 'bad_target';
    end if;
    insert into public.dessert_bombs(season_id, attacker_member_id, target_member_id, deadline)
      values (m.season_id, p_member, v_target, now() + interval '24 hours');

  elsif it.key = 'ai_avatar' then
    update public.season_members
      set ai_avatar_url = coalesce(nullif(p_meta->>'avatar_url',''), 'pending') where id = p_member;

  else
    -- generic cosmetic: append its key to the owned-cosmetics array
    update public.season_members
      set cosmetics = (select jsonb_agg(distinct x) from jsonb_array_elements(m.cosmetics || to_jsonb(it.key)) x)
      where id = p_member;
  end if;

  insert into public.ledger(member_id, season_id, type, amount, description, ref_type)
    values (p_member, m.season_id, v_ledger_type, -it.price, it.name, 'shop');

  insert into public.purchases(member_id, item_id, item_key, price, meta)
    values (p_member, it.id, it.key, it.price, p_meta)
    returning id into v_purchase;

  return v_purchase;
end; $$;
