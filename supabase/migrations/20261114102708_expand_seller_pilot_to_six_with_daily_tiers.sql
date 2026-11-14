-- Expand the 10-day Takealot seller pilot to five standard seats and one Beyond Shopping seat.
alter table public.seller_pilot_access
  add column if not exists daily_limit smallint not null default 15,
  add column if not exists pilot_label text;
alter table public.seller_pilot_access
  drop constraint if exists seller_pilot_access_daily_limit_check;
alter table public.seller_pilot_access
  add constraint seller_pilot_access_daily_limit_check check (daily_limit in (15,20));

drop function if exists public.activate_seller_pilot(uuid,uuid);
create or replace function public.activate_seller_pilot(
  p_user_id uuid,
  p_admin_id uuid,
  p_daily_limit integer default 15,
  p_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_total integer;
  v_standard integer;
  v_plus integer;
  v_row public.seller_pilot_access%rowtype;
  v_started timestamptz;
  v_ends timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('seller-pilot-capacity'));
  if p_daily_limit not in (15,20) then
    return jsonb_build_object('ok',false,'reason','INVALID_DAILY_LIMIT');
  end if;
  if not exists (select 1 from auth.users where id=p_user_id) then
    return jsonb_build_object('ok',false,'reason','USER_NOT_FOUND');
  end if;
  select * into v_row from public.seller_pilot_access where user_id=p_user_id;
  if found and v_row.status='active' and v_row.ends_at > now() then
    return jsonb_build_object('ok',true,'already_active',true,'started_at',v_row.started_at,
      'ends_at',v_row.ends_at,'daily_limit',v_row.daily_limit,'pilot_label',v_row.pilot_label);
  end if;
  select count(*) into v_total from public.seller_pilot_access where status='active' and ends_at > now();
  select count(*) into v_standard from public.seller_pilot_access where status='active' and ends_at > now() and daily_limit=15;
  select count(*) into v_plus from public.seller_pilot_access where status='active' and ends_at > now() and daily_limit=20;
  if v_total >= 6 then return jsonb_build_object('ok',false,'reason','PILOT_CAPACITY_REACHED','limit',6); end if;
  if p_daily_limit=15 and v_standard >= 5 then return jsonb_build_object('ok',false,'reason','STANDARD_SEATS_FULL','limit',5); end if;
  if p_daily_limit=20 and v_plus >= 1 then return jsonb_build_object('ok',false,'reason','BEYOND_SHOPPING_SEAT_FULL','limit',1); end if;
  v_started := now();
  v_ends := v_started + interval '10 days';
  insert into public.seller_pilot_access(user_id,started_at,ends_at,status,created_by,daily_limit,pilot_label)
  values (p_user_id,v_started,v_ends,'active',p_admin_id,p_daily_limit,nullif(trim(p_label),''))
  on conflict (user_id) do update set started_at=excluded.started_at,ends_at=excluded.ends_at,status='active',
    created_by=excluded.created_by,created_at=now(),daily_limit=excluded.daily_limit,pilot_label=excluded.pilot_label;
  update public.profiles set marketplace_access=array['takealot']::text[],updated_at=now() where id=p_user_id;
  return jsonb_build_object('ok',true,'already_active',false,'started_at',v_started,'ends_at',v_ends,
    'daily_limit',p_daily_limit,'marketplace_access',jsonb_build_array('takealot'),'pilot_label',nullif(trim(p_label),''));
end;
$function$;

create or replace function public.reserve_seller_pilot_search(p_user_id uuid,p_marketplace text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_access public.seller_pilot_access%rowtype;
  v_today date;
  v_used integer;
  v_limit integer;
begin
  if p_marketplace <> 'takealot' then return jsonb_build_object('allowed',false,'reason','PILOT_TAKEALOT_ONLY'); end if;
  select * into v_access from public.seller_pilot_access where user_id=p_user_id and status='active' for update;
  if not found then return jsonb_build_object('allowed',false,'reason','PILOT_NOT_ACTIVE'); end if;
  if now() < v_access.started_at or now() >= v_access.ends_at then
    update public.seller_pilot_access set status='expired' where user_id=p_user_id and status='active' and now() >= ends_at;
    return jsonb_build_object('allowed',false,'reason','PILOT_EXPIRED','ends_at',v_access.ends_at);
  end if;
  v_limit := v_access.daily_limit;
  v_today := (now() at time zone 'Africa/Johannesburg')::date;
  insert into public.seller_pilot_daily_usage(user_id,usage_date,searches_used) values (p_user_id,v_today,0) on conflict (user_id,usage_date) do nothing;
  update public.seller_pilot_daily_usage set searches_used=searches_used+1,updated_at=now()
    where user_id=p_user_id and usage_date=v_today and searches_used < v_limit returning searches_used into v_used;
  if v_used is null then
    select searches_used into v_used from public.seller_pilot_daily_usage where user_id=p_user_id and usage_date=v_today;
    return jsonb_build_object('allowed',false,'reason','PILOT_DAILY_LIMIT','used',v_used,'limit',v_limit,'ends_at',v_access.ends_at);
  end if;
  return jsonb_build_object('allowed',true,'used',v_used,'limit',v_limit,'ends_at',v_access.ends_at,'remaining',v_limit-v_used);
end;
$function$;

revoke all on function public.activate_seller_pilot(uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.activate_seller_pilot(uuid,uuid,integer,text) to service_role;
revoke all on function public.reserve_seller_pilot_search(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_seller_pilot_search(uuid,text) to service_role;
