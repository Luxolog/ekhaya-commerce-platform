-- Owner-governed marketplace cache policy and correct period-aware credit refunds.
create table if not exists public.marketplace_cache_settings (
  id boolean primary key default true check (id),
  refresh_enabled boolean not null default true,
  cache_ttl_minutes integer not null default 360 check (cache_ttl_minutes between 5 and 10080),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.marketplace_cache_settings(id) values (true) on conflict (id) do nothing;
alter table public.marketplace_cache_settings enable row level security;
revoke all on public.marketplace_cache_settings from anon, authenticated;
grant all on public.marketplace_cache_settings to service_role;

create or replace function public.refund_monthly_search_credit(
  p_user_id uuid, p_request_id uuid, p_marketplace text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_period date; v_event bigint;
begin
  update public.search_credit_events
  set status='refunded'
  where user_id=p_user_id and request_id=p_request_id and marketplace=p_marketplace
    and status='reserved'
  returning id, period_start into v_event, v_period;
  if v_event is null then return false; end if;
  update public.user_monthly_search_usage
  set searches_used = greatest(0, searches_used - 1), updated_at=now()
  where user_id=p_user_id and period_start=v_period;
  return true;
end;
$$;
revoke all on function public.refund_monthly_search_credit(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.refund_monthly_search_credit(uuid,uuid,text) to service_role;
