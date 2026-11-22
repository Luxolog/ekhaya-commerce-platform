-- Maintain request-level partner support reservation state.
-- Cache hits no longer reserve support allowance; failed live attempts can refund
-- exactly once while the unique request row remains as an idempotency tombstone.

alter table private.partner_support_search_usage
  add column if not exists status text not null default 'completed'
    check (status in ('reserved','completed','refunded'));
alter table private.partner_support_search_usage
  add column if not exists refunded_at timestamptz;
alter table private.partner_support_search_usage
  alter column status set default 'reserved';

create or replace function public.reserve_partner_support_search(
  p_user_id uuid,
  p_marketplace text,
  p_request_id uuid,
  p_search_query text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_usage_date date := (now() at time zone 'Africa/Johannesburg')::date;
  v_used integer;
  v_limit constant integer := 10;
  v_inserted_id bigint;
begin
  if p_user_id is null or p_request_id is null or p_marketplace is null
     or p_marketplace not in ('takealot','amazon','makro')
     or length(btrim(coalesce(p_search_query,''))) < 2
     or length(btrim(p_search_query)) > 160 then
    return jsonb_build_object('allowed',false,'reason','INVALID_REQUEST');
  end if;

  if not exists (
    select 1 from public.partner_programs pp
    where pp.partner_user_id = p_user_id and pp.status = 'active'
  ) then
    return jsonb_build_object('allowed',false,'reason','ACTIVE_PARTNER_REQUIRED');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_usage_date::text, 0));

  if exists (
    select 1 from private.partner_support_search_usage u
    where u.partner_user_id = p_user_id and u.request_id = p_request_id
  ) then
    select count(*)::integer into v_used
    from private.partner_support_search_usage u
    where u.partner_user_id = p_user_id and u.usage_date = v_usage_date
      and u.status <> 'refunded';
    return jsonb_build_object('allowed',true,'duplicate',true,'used',v_used,'limit',v_limit,'remaining',greatest(0,v_limit-v_used));
  end if;

  select count(*)::integer into v_used
  from private.partner_support_search_usage u
  where u.partner_user_id = p_user_id and u.usage_date = v_usage_date
    and u.status <> 'refunded';

  if v_used >= v_limit then
    return jsonb_build_object('allowed',false,'reason','PARTNER_SUPPORT_DAILY_LIMIT','used',v_used,'limit',v_limit,'remaining',0);
  end if;

  insert into private.partner_support_search_usage(partner_user_id,request_id,marketplace,search_query,usage_date,status)
  values (p_user_id,p_request_id,p_marketplace,btrim(p_search_query),v_usage_date,'reserved')
  returning id into v_inserted_id;

  v_used := v_used + 1;
  return jsonb_build_object('allowed',true,'duplicate',false,'used',v_used,'limit',v_limit,'remaining',greatest(0,v_limit-v_used),'usage_id',v_inserted_id);
end;
$function$;

revoke all on function public.reserve_partner_support_search(uuid,text,uuid,text)
  from public,anon,authenticated;
grant execute on function public.reserve_partner_support_search(uuid,text,uuid,text)
  to service_role;
create or replace function public.refund_partner_support_search(
  p_user_id uuid,
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_updated_id bigint;
begin
  if p_user_id is null or p_request_id is null then
    return false;
  end if;

  update private.partner_support_search_usage
  set status='refunded', refunded_at=now()
  where partner_user_id = p_user_id
    and request_id = p_request_id
    and status='reserved'
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$function$;

revoke all on function public.refund_partner_support_search(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.refund_partner_support_search(uuid, uuid)
  to service_role;

create or replace function public.complete_partner_support_search(
  p_user_id uuid,
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_updated_id bigint;
begin
  if p_user_id is null or p_request_id is null then
    return false;
  end if;

  update private.partner_support_search_usage
  set status='completed'
  where partner_user_id=p_user_id
    and request_id=p_request_id
    and status='reserved'
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$function$;

revoke all on function public.complete_partner_support_search(uuid, uuid)
  from public,anon,authenticated;
grant execute on function public.complete_partner_support_search(uuid, uuid)
  to service_role;



comment on function public.refund_partner_support_search(uuid, uuid) is
  'Refunds a failed live partner support search once while retaining its request idempotency record. Cache hits are not reserved.';
