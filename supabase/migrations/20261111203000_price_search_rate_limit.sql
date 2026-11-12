create table if not exists public.price_search_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.price_search_rate_limits enable row level security;
revoke all on public.price_search_rate_limits from anon, authenticated;

create or replace function public.consume_price_search_quota(
  p_ip_hash text,
  p_limit integer default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  insert into public.price_search_rate_limits(ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update
    set window_started_at = case
          when public.price_search_rate_limits.window_started_at < now() - interval '1 hour' then now()
          else public.price_search_rate_limits.window_started_at end,
        request_count = case
          when public.price_search_rate_limits.window_started_at < now() - interval '1 hour' then 1
          else public.price_search_rate_limits.request_count + 1 end,
        updated_at = now()
  where public.price_search_rate_limits.window_started_at < now() - interval '1 hour'
     or public.price_search_rate_limits.request_count < p_limit
  returning request_count <= p_limit into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_price_search_quota(text, integer) from public, anon, authenticated;
grant execute on function public.consume_price_search_quota(text, integer) to service_role;
