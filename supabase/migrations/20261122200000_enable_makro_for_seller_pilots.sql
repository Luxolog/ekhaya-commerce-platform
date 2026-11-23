-- Enable all currently supported marketplaces for pilot sellers.
-- Makro already has a live ReefAPI integration; pilot restrictions must not block it.

create or replace function public.activate_seller_pilot(
  p_user_id uuid,
  p_admin_id uuid,
  p_daily_limit integer default 10,
  p_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_row public.seller_pilot_access%rowtype;
  v_started timestamptz;
  v_ends timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('seller-pilot-capacity'));
  if p_daily_limit <> 10 then
    return jsonb_build_object('ok',false,'reason','INVALID_DAILY_LIMIT','required',10);
  end if;
  if not exists (select 1 from auth.users where id=p_user_id) then
    return jsonb_build_object('ok',false,'reason','USER_NOT_FOUND');
  end if;

  select * into v_row from public.seller_pilot_access where user_id=p_user_id;
  if found and v_row.status='active' and v_row.ends_at > now() then
    update public.profiles
      set marketplace_access=array['takealot','amazon','makro']::text[],updated_at=now()
      where id=p_user_id;
    return jsonb_build_object('ok',true,'already_active',true,'started_at',v_row.started_at,
      'ends_at',v_row.ends_at,'daily_limit',v_row.daily_limit,'total_limit',v_row.total_limit,
      'marketplace_access',jsonb_build_array('takealot','amazon','makro'),
      'pilot_label',v_row.pilot_label);
  end if;

  select count(*) into v_total from public.seller_pilot_access
    where status='active' and ends_at > now() and user_id <> p_user_id;
  if v_total >= 6 then
    return jsonb_build_object('ok',false,'reason','PILOT_CAPACITY_REACHED','limit',6);
  end if;

  v_started := now();
  v_ends := v_started + interval '5 days';
  insert into public.seller_pilot_access(user_id,started_at,ends_at,status,created_by,daily_limit,total_limit,pilot_label)
  values (p_user_id,v_started,v_ends,'active',p_admin_id,10,50,nullif(trim(p_label),''))
  on conflict (user_id) do update set
    started_at=excluded.started_at,ends_at=excluded.ends_at,status='active',
    created_by=excluded.created_by,created_at=now(),daily_limit=10,total_limit=50,
    pilot_label=excluded.pilot_label;

  update public.profiles
    set marketplace_access=array['takealot','amazon','makro']::text[],updated_at=now()
    where id=p_user_id;

  return jsonb_build_object('ok',true,'already_active',false,'started_at',v_started,
    'ends_at',v_ends,'daily_limit',10,'total_limit',50,
    'marketplace_access',jsonb_build_array('takealot','amazon','makro'),
    'pilot_label',nullif(trim(p_label),''));
end;
$$;

create or replace function public.reserve_seller_pilot_search(
  p_user_id uuid,
  p_marketplace text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_access public.seller_pilot_access%rowtype;
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_used integer;
  v_total_used integer;
  v_event_id bigint;
begin
  if p_user_id is null or p_request_id is null or p_marketplace is null
     or p_marketplace not in ('takealot','amazon','makro') then
    return jsonb_build_object('allowed',false,'reason','INVALID_REQUEST');
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

  if exists (
    select 1 from public.seller_pilot_search_events
    where user_id=p_user_id and request_id=p_request_id
  ) then
    select searches_used into v_used
      from public.seller_pilot_daily_usage
      where user_id=p_user_id and usage_date=v_today;
    select coalesce(sum(searches_used),0)::integer into v_total_used
      from public.seller_pilot_daily_usage where user_id=p_user_id;
    return jsonb_build_object('allowed',true,'duplicate',true,'used',coalesce(v_used,0),
      'total_used',v_total_used,'limit',v_access.daily_limit,'total_limit',v_access.total_limit);
  end if;

  select coalesce(sum(searches_used),0)::integer into v_total_used
    from public.seller_pilot_daily_usage where user_id=p_user_id;
  if v_total_used >= v_access.total_limit then
    return jsonb_build_object('allowed',false,'reason','PILOT_TOTAL_LIMIT',
      'used',v_total_used,'limit',v_access.total_limit,'ends_at',v_access.ends_at);
  end if;

  insert into public.seller_pilot_search_events(user_id,request_id,marketplace,usage_date)
    values (p_user_id,p_request_id,p_marketplace,v_today)
    on conflict (user_id,request_id) do nothing
    returning id into v_event_id;
  if v_event_id is null then
    return jsonb_build_object('allowed',true,'duplicate',true);
  end if;

  insert into public.seller_pilot_daily_usage(user_id,usage_date,searches_used)
    values (p_user_id,v_today,0) on conflict (user_id,usage_date) do nothing;
  update public.seller_pilot_daily_usage
    set searches_used=searches_used+1,updated_at=now()
    where user_id=p_user_id and usage_date=v_today
      and searches_used < v_access.daily_limit
    returning searches_used into v_used;

  if v_used is null then
    delete from public.seller_pilot_search_events where id=v_event_id;
    select searches_used into v_used from public.seller_pilot_daily_usage
      where user_id=p_user_id and usage_date=v_today;
    return jsonb_build_object('allowed',false,'reason','PILOT_DAILY_LIMIT',
      'used',coalesce(v_used,0),'limit',v_access.daily_limit,'ends_at',v_access.ends_at);
  end if;

  return jsonb_build_object('allowed',true,'duplicate',false,'used',v_used,
    'limit',v_access.daily_limit,'total_used',v_total_used+1,'total_limit',v_access.total_limit,
    'ends_at',v_access.ends_at,'remaining_today',v_access.daily_limit-v_used,
    'remaining_total',v_access.total_limit-v_total_used-1);
end;
$function$;

revoke all on function public.activate_seller_pilot(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.reserve_seller_pilot_search(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.activate_seller_pilot(uuid,uuid,integer,text) to service_role;
grant execute on function public.reserve_seller_pilot_search(uuid,text,uuid) to service_role;
