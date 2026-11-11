-- Shared marketplace price cache and refresh infrastructure.
-- All writes are server-side only. Never expose ReefAPI credentials to the browser.

create table public.marketplace_price_cache (
  marketplace text not null,
  lookup_key text not null,
  external_product_id text,
  product_title text,
  variant_label text,
  price numeric(12,2),
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
  constraint marketplace_price_nonnegative check (price is null or price >= 0),
  constraint marketplace_price_expiry check (expires_at >= fetched_at)
);

create index marketplace_price_cache_expiry_idx on public.marketplace_price_cache (expires_at);
create index marketplace_price_cache_product_idx on public.marketplace_price_cache (marketplace, external_product_id);

create table public.marketplace_price_history (
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
create index marketplace_price_history_lookup_idx
  on public.marketplace_price_history (marketplace, lookup_key, recorded_at desc);

create table public.price_refresh_queue (
  id bigint generated always as identity primary key,
  marketplace text not null,
  lookup_key text not null,
  priority smallint not null default 10 check (priority between 1 and 100),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default now(),
  attempts smallint not null default 0,
  last_error text,
  completed_at timestamptz
);
create index price_refresh_queue_due_idx on public.price_refresh_queue (status, scheduled_for, priority);
create unique index price_refresh_queue_one_active_lookup
  on public.price_refresh_queue (marketplace, lookup_key)
  where status in ('pending', 'processing');

create table public.api_usage_ledger (
  id bigint generated always as identity primary key,
  provider text not null,
  action text not null,
  marketplace text,
  lookup_key text,
  credits_charged numeric(12,4) not null default 0 check (credits_charged >= 0),
  request_status text not null check (request_status in ('success', 'failed', 'cached')),
  response_count integer not null default 0,
  request_id text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index api_usage_ledger_created_idx on public.api_usage_ledger (created_at desc);
create index api_usage_ledger_provider_idx on public.api_usage_ledger (provider, created_at desc);

-- Cache, queue, history and usage data are server-side only.
alter table public.marketplace_price_cache enable row level security;
alter table public.marketplace_price_history enable row level security;
alter table public.price_refresh_queue enable row level security;
alter table public.api_usage_ledger enable row level security;

revoke all on public.marketplace_price_cache from anon, authenticated;
revoke all on public.marketplace_price_history from anon, authenticated;
revoke all on public.price_refresh_queue from anon, authenticated;
revoke all on public.api_usage_ledger from anon, authenticated;

grant all on public.marketplace_price_cache to service_role;
grant all on public.marketplace_price_history to service_role;
grant all on public.price_refresh_queue to service_role;
grant all on public.api_usage_ledger to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Workers should claim due jobs in a transaction with row-level locking and SKIP LOCKED.
-- Record price history only when a successful refresh changes a meaningful value.
-- Cache hits must never create price-history rows.
