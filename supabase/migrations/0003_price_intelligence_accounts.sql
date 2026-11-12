-- Ekhaya Price Checker platform foundation
-- Applied to Supabase project itxxnhcjjiynrmivexcb on 2026-11-11.
-- Public client access is limited to a user's own profile, subscription,
-- marketplace connection status and usage summary. Cache and operational
-- tables are server-side only.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  plan_code text not null default 'free' check (plan_code in ('free','starter','pro','business')),
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_provider text not null default 'payfast',
  provider_subscription_id text,
  plan_code text not null check (plan_code in ('starter','pro','business')),
  status text not null check (status in ('pending','active','past_due','cancelled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_provider, provider_subscription_id)
);
create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status, current_period_end desc);

create table if not exists public.marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('takealot','amazon')),
  external_seller_id text,
  status text not null default 'pending' check (status in ('pending','connected','expired','revoked','error')),
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, marketplace)
);

create table if not exists public.user_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  product_searches integer not null default 0 check (product_searches >= 0),
  live_refreshes integer not null default 0 check (live_refreshes >= 0),
  cache_hits integer not null default 0 check (cache_hits >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create table if not exists public.marketplace_price_cache (
  marketplace text not null check (marketplace in ('takealot','amazon')),
  lookup_key text not null,
  external_product_id text,
  product_title text,
  variant_label text,
  price numeric(12,2) check (price is null or price >= 0),
  currency char(3) not null default 'ZAR',
  in_stock boolean,
  seller_name text,
  product_url text,
  image_url text,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  last_error text,
  source_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (marketplace, lookup_key),
  check (expires_at >= fetched_at)
);
create index if not exists marketplace_price_cache_expiry_idx
  on public.marketplace_price_cache(expires_at);
create index if not exists marketplace_price_cache_product_idx
  on public.marketplace_price_cache(marketplace, external_product_id);

create table if not exists public.marketplace_price_history (
  id bigint generated always as identity primary key,
  marketplace text not null,
  lookup_key text not null,
  external_product_id text,
  product_title text,
  price numeric(12,2) not null check (price >= 0),
  currency char(3) not null default 'ZAR',
  in_stock boolean,
  seller_name text,
  recorded_at timestamptz not null default now()
);
create index if not exists marketplace_price_history_lookup_idx
  on public.marketplace_price_history(marketplace, lookup_key, recorded_at desc);

create table if not exists public.price_refresh_queue (
  id bigint generated always as identity primary key,
  marketplace text not null,
  lookup_key text not null,
  priority smallint not null default 10 check (priority between 1 and 100),
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default now(),
  attempts smallint not null default 0,
  last_error text,
  completed_at timestamptz
);
create index if not exists price_refresh_queue_due_idx
  on public.price_refresh_queue(status, scheduled_for, priority);
create unique index if not exists price_refresh_queue_one_active_lookup
  on public.price_refresh_queue(marketplace, lookup_key)
  where status in ('pending','processing');

create table if not exists public.api_usage_ledger (
  id bigint generated always as identity primary key,
  provider text not null,
  action text not null,
  marketplace text,
  lookup_key text,
  credits_charged numeric(12,4) not null default 0 check (credits_charged >= 0),
  request_status text not null check (request_status in ('success','failed','cached')),
  response_count integer not null default 0,
  request_id text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists api_usage_ledger_created_idx
  on public.api_usage_ledger(created_at desc);
create index if not exists api_usage_ledger_provider_idx
  on public.api_usage_ledger(provider, created_at desc);
create index if not exists api_usage_ledger_actor_created_idx
  on public.api_usage_ledger(actor_id, created_at desc);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles(id, display_name)
select id, nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')), '')
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.marketplace_connections enable row level security;
alter table public.user_daily_usage enable row level security;
alter table public.marketplace_price_cache enable row level security;
alter table public.marketplace_price_history enable row level security;
alter table public.price_refresh_queue enable row level security;
alter table public.api_usage_ledger enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.marketplace_connections from anon, authenticated;
grant select on public.marketplace_connections to authenticated;
create policy marketplace_connections_select_own on public.marketplace_connections
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_daily_usage from anon, authenticated;
grant select on public.user_daily_usage to authenticated;
create policy user_daily_usage_select_own on public.user_daily_usage
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.marketplace_price_cache from anon, authenticated;
revoke all on public.marketplace_price_history from anon, authenticated;
revoke all on public.price_refresh_queue from anon, authenticated;
revoke all on public.api_usage_ledger from anon, authenticated;

grant all on public.profiles, public.subscriptions, public.marketplace_connections,
  public.user_daily_usage, public.marketplace_price_cache, public.marketplace_price_history,
  public.price_refresh_queue, public.api_usage_ledger to service_role;
grant usage, select on all sequences in schema public to service_role;
