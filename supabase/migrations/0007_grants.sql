-- Harden SECURITY DEFINER functions. The mutation RPCs treat a null auth.uid()
-- (the anon role) as a trusted service call, so they must be callable ONLY by the
-- service_role. All client mutations go through Next.js server routes that
-- authenticate the user and pass the resolved member id.
revoke execute on function
  public.buy_offer(uuid, uuid, numeric, int, numeric),
  public.sell_position(uuid, uuid, int),
  public.list_position(uuid, uuid),
  public.casino_sit(uuid, int, int),
  public.shop_purchase(uuid, text, jsonb),
  public.member_balance(uuid),
  public.assert_owner(uuid)
from public, anon, authenticated;

grant execute on function
  public.buy_offer(uuid, uuid, numeric, int, numeric),
  public.sell_position(uuid, uuid, int),
  public.list_position(uuid, uuid),
  public.casino_sit(uuid, int, int),
  public.shop_purchase(uuid, text, jsonb),
  public.member_balance(uuid),
  public.assert_owner(uuid)
to service_role;

-- Trigger-only function: not part of the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- RLS helper functions are needed by the authenticated role for policy evaluation,
-- but never by anon.
revoke execute on function
  public.approved_season_ids(),
  public.admin_season_ids(),
  public.my_member_ids(),
  public.visible_member_ids()
from anon;
