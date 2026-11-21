-- Ekhaya AI Marketing seller add-on foundation.
-- Isolated from marketplace subscriptions, search-credit allocations and payment triggers.

create table if not exists public.marketing_plans (
  code text primary key,
  name text not null,
  price_zar numeric(10,2) not null check (price_zar >= 0),
  billing_interval text not null default 'month' check (billing_interval = 'month'),
  monthly_ai_posts integer not null default 0 check (monthly_ai_posts >= 0),
  monthly_campaign_ideas integer not null default 0 check (monthly_campaign_ideas >= 0),
  monthly_research_queries integer not null default 0 check (monthly_research_queries >= 0),
  monthly_trend_reports integer not null default 0 check (monthly_trend_reports >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.marketing_plans
  (code, name, price_zar, billing_interval, monthly_ai_posts, monthly_campaign_ideas, monthly_research_queries, monthly_trend_reports, is_active)
values
  ('marketing_mini', 'Marketing Mini', 29.00, 'month', 10, 4, 5, 1, true)
on conflict (code) do update set
  name = excluded.name,
  price_zar = excluded.price_zar,
  billing_interval = excluded.billing_interval,
  monthly_ai_posts = excluded.monthly_ai_posts,
  monthly_campaign_ideas = excluded.monthly_campaign_ideas,
  monthly_research_queries = excluded.monthly_research_queries,
  monthly_trend_reports = excluded.monthly_trend_reports,
  is_active = excluded.is_active;

create table if not exists public.seller_marketing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.marketing_plans(code),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  billing_mode text not null default 'manual' check (billing_mode in ('manual', 'recurring')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_marketing_subscriptions_user_created_idx
  on public.seller_marketing_subscriptions(user_id, created_at desc);
create unique index if not exists seller_marketing_one_active_subscription_per_user_idx
  on public.seller_marketing_subscriptions(user_id)
  where status = 'active';

create table if not exists public.marketing_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.seller_marketing_subscriptions(id) on delete set null,
  feature_code text not null
    check (feature_code in ('ai_post', 'campaign_idea', 'research_query', 'trend_report')),
  quantity integer not null default 1 check (quantity > 0),
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketing_usage_events_user_feature_date_idx
  on public.marketing_usage_events(user_id, feature_code, created_at desc);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  objective text,
  platform text check (platform is null or platform in ('facebook', 'instagram', 'tiktok', 'linkedin', 'other')),
  content text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'archived')),
  approval_requested_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_campaigns_user_updated_idx
  on public.marketing_campaigns(user_id, updated_at desc);

create table if not exists public.marketing_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketing_subscription_id uuid references public.seller_marketing_subscriptions(id) on delete set null,
  payment_provider text not null default 'paystack' check (payment_provider = 'paystack'),
  merchant_reference text not null unique,
  amount numeric(10,2) not null check (amount > 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'created'
    check (status in ('created', 'pending', 'complete', 'failed', 'refunded')),
  provider_transaction_id text,
  provider_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_payment_transactions_user_created_idx
  on public.marketing_payment_transactions(user_id, created_at desc);

alter table public.marketing_plans enable row level security;
alter table public.seller_marketing_subscriptions enable row level security;
alter table public.marketing_usage_events enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_payment_transactions enable row level security;

drop policy if exists marketing_plans_read_active on public.marketing_plans;
create policy marketing_plans_read_active
  on public.marketing_plans for select to authenticated
  using (is_active = true);

drop policy if exists seller_marketing_subscriptions_read_own on public.seller_marketing_subscriptions;
create policy seller_marketing_subscriptions_read_own
  on public.seller_marketing_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists marketing_usage_events_read_own on public.marketing_usage_events;
create policy marketing_usage_events_read_own
  on public.marketing_usage_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists marketing_campaigns_read_own on public.marketing_campaigns;
create policy marketing_campaigns_read_own
  on public.marketing_campaigns for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists marketing_campaigns_insert_own on public.marketing_campaigns;
create policy marketing_campaigns_insert_own
  on public.marketing_campaigns for insert to authenticated
  with check ((select auth.uid()) = user_id and status in ('draft', 'pending_approval'));

drop policy if exists marketing_campaigns_update_own on public.marketing_campaigns;
create policy marketing_campaigns_update_own
  on public.marketing_campaigns for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status in ('draft', 'pending_approval', 'archived'));

drop policy if exists marketing_campaigns_delete_own on public.marketing_campaigns;
create policy marketing_campaigns_delete_own
  on public.marketing_campaigns for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists marketing_payment_transactions_read_own on public.marketing_payment_transactions;
create policy marketing_payment_transactions_read_own
  on public.marketing_payment_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

-- No client-side INSERT/UPDATE policies are intentionally granted for subscriptions,
-- usage events or payment records. Trusted server-side billing/usage functions will own writes.
