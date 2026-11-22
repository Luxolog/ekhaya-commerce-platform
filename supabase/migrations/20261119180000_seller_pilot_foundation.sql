-- Seller pilot foundation required by the pilot-limit and lifecycle migrations.
-- Kept before 20261119190058 so a clean local database can replay the full history.
-- Operational access is service-role only; seller reads are served through the
-- authenticated marketplace-search Edge Function.

alter table public.profiles
  add column if not exists marketplace_access text[] not null default '{}'::text[];

create table if not exists public.seller_pilot_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'expired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  daily_limit integer not null default 10,
  total_limit integer not null default 50,
  pilot_label text,
  constraint seller_pilot_access_window_check check (ends_at > started_at),
  constraint seller_pilot_access_daily_limit_positive check (daily_limit > 0),
  constraint seller_pilot_access_total_limit_positive check (total_limit between 1 and 50)
);

create index if not exists seller_pilot_access_status_ends_idx
  on public.seller_pilot_access(status, ends_at);

create table if not exists public.seller_pilot_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  searches_used integer not null default 0 check (searches_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.seller_pilot_access enable row level security;
alter table public.seller_pilot_daily_usage enable row level security;

revoke all on public.seller_pilot_access from anon, authenticated;
revoke all on public.seller_pilot_daily_usage from anon, authenticated;
grant all on public.seller_pilot_access to service_role;
grant all on public.seller_pilot_daily_usage to service_role;
