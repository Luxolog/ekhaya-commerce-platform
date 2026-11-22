-- Partner Support Search: separate allowance and audit ledger.
-- Active linked partners receive 10 support searches per South African calendar day.
-- This entitlement is independent of seller profiles, seller pilot access and seller credits.

create table if not exists private.partner_support_search_usage (
  id bigint generated always as identity primary key,
  partner_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  marketplace text not null check (marketplace in ('takealot','amazon','makro')),
  search_query text not null check (char_length(search_query) between 2 and 160),
  usage_date date not null default ((now() at time zone 'Africa/Johannesburg')::date),
  created_at timestamptz not null default now(),
  unique (partner_user_id, request_id)
);

create index if not exists partner_support_search_usage_daily_idx
  on private.partner_support_search_usage (partner_user_id, usage_date);

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
  if p_user_id is null or p_request_id is null
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
    where u.partner_user_id = p_user_id and u.usage_date = v_usage_date;
    return jsonb_build_object('allowed',true,'duplicate',true,'used',v_used,'limit',v_limit,'remaining',greatest(0,v_limit-v_used));
  end if;

  select count(*)::integer into v_used
  from private.partner_support_search_usage u
  where u.partner_user_id = p_user_id and u.usage_date = v_usage_date;

  if v_used >= v_limit then
    return jsonb_build_object('allowed',false,'reason','PARTNER_SUPPORT_DAILY_LIMIT','used',v_used,'limit',v_limit,'remaining',0);
  end if;

  insert into private.partner_support_search_usage(partner_user_id,request_id,marketplace,search_query,usage_date)
  values (p_user_id,p_request_id,p_marketplace,btrim(p_search_query),v_usage_date)
  returning id into v_inserted_id;

  v_used := v_used + 1;
  return jsonb_build_object('allowed',true,'duplicate',false,'used',v_used,'limit',v_limit,'remaining',greatest(0,v_limit-v_used),'usage_id',v_inserted_id);
end;
$function$;

revoke all on function public.reserve_partner_support_search(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_partner_support_search(uuid,text,uuid,text) to service_role;
