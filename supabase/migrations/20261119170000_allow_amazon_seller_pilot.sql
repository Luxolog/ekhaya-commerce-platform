-- Allow approved pilot sellers to use both Takealot and Amazon South Africa.
-- The existing daily limit remains shared across the two marketplaces.

CREATE OR REPLACE FUNCTION public.reserve_seller_pilot_search(p_user_id uuid, p_marketplace text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_access public.seller_pilot_access%rowtype;
  v_today date;
  v_used integer;
  v_limit integer;
begin
  if p_marketplace not in ('takealot','amazon') then
    return jsonb_build_object('allowed',false,'reason','PILOT_MARKETPLACE_UNSUPPORTED');
  end if;
  select * into v_access from public.seller_pilot_access
    where user_id=p_user_id and status='active' for update;
  if not found then
    return jsonb_build_object('allowed',false,'reason','PILOT_NOT_ACTIVE');
  end if;
  if now() < v_access.started_at or now() >= v_access.ends_at then
    update public.seller_pilot_access set status='expired'
      where user_id=p_user_id and status='active' and now() >= ends_at;
    return jsonb_build_object('allowed',false,'reason','PILOT_EXPIRED','ends_at',v_access.ends_at);
  end if;
  v_limit := v_access.daily_limit;
  v_today := (now() at time zone 'Africa/Johannesburg')::date;
  insert into public.seller_pilot_daily_usage(user_id,usage_date,searches_used)
    values (p_user_id,v_today,0) on conflict (user_id,usage_date) do nothing;
  update public.seller_pilot_daily_usage
    set searches_used=searches_used+1,updated_at=now()
    where user_id=p_user_id and usage_date=v_today and searches_used < v_limit
    returning searches_used into v_used;
  if v_used is null then
    select searches_used into v_used from public.seller_pilot_daily_usage
      where user_id=p_user_id and usage_date=v_today;
    return jsonb_build_object('allowed',false,'reason','PILOT_DAILY_LIMIT',
      'used',v_used,'limit',v_limit,'ends_at',v_access.ends_at);
  end if;
  return jsonb_build_object('allowed',true,'used',v_used,'limit',v_limit,
    'ends_at',v_access.ends_at,'remaining',v_limit-v_used);
end;
$function$;
