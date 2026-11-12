-- Ekhaya Price Checker subscriptions and billing foundation
-- Safe defaults: existing subscriptions are manual until a customer explicitly opts into automatic renewal.
-- Payment credentials and provider tokens are never stored in client-readable tables.

create table if not exists public.billing_plans (
  code text primary key check (code in ('starter','growth','pro','business')),
  name text not null,
  intro_price numeric(10,2) not null default 49.00 check (intro_price >= 0),
  monthly_price numeric(10,2) not null check (monthly_price > 0),
  currency char(3) not null default 'ZAR',
  is_active boolean not null default true,
  display_order smallint not null,
  updated_at timestamptz not null default now()
);

insert into public.billing_plans (code, name, intro_price, monthly_price, display_order)
values
  ('starter', 'Starter', 49.00, 99.00, 1),
  ('growth', 'Growth', 49.00, 149.00, 2),
  ('pro', 'Pro', 49.00, 199.00, 3),
  ('business', 'Business', 49.00, 299.00, 4)
on conflict (code) do update set
  name = excluded.name,
  intro_price = excluded.intro_price,
  monthly_price = excluded.monthly_price,
  display_order = excluded.display_order,
  updated_at = now();

alter table public.billing_plans enable row level security;
revoke all on public.billing_plans from anon, authenticated;
grant select on public.billing_plans to anon, authenticated;
create policy billing_plans_read_active on public.billing_plans
  for select to anon, authenticated using (is_active);

alter table public.profiles
  drop constraint if exists profiles_plan_code_check;
alter table public.profiles
  add constraint profiles_plan_code_check
  check (plan_code in ('free','starter','growth','pro','business'));

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_code_check;
alter table public.subscriptions
  add constraint subscriptions_plan_code_check
  check (plan_code in ('starter','growth','pro','business'));

alter table public.subscriptions
  add column if not exists billing_mode text not null default 'manual'
    check (billing_mode in ('manual','automatic')),
  add column if not exists intro_price numeric(10,2) not null default 49.00
    check (intro_price >= 0),
  add column if not exists renewal_amount numeric(10,2)
    check (renewal_amount is null or renewal_amount > 0),
  add column if not exists intro_payment_completed_at timestamptz,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancelled_at timestamptz;

create index if not exists subscriptions_due_idx
  on public.subscriptions(status, current_period_end)
  where status in ('active','past_due');

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_provider text not null default 'payfast',
  provider_payment_id text,
  merchant_reference text not null unique,
  payment_kind text not null check (payment_kind in ('introductory','renewal','manual_renewal','one_off')),
  billing_mode text not null check (billing_mode in ('manual','automatic')),
  amount numeric(10,2) not null check (amount > 0),
  currency char(3) not null default 'ZAR',
  status text not null check (status in ('created','pending','complete','failed','cancelled','refunded')),
  paid_at timestamptz,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_provider, provider_payment_id)
);

create index if not exists payment_transactions_user_created_idx
  on public.payment_transactions(user_id, created_at desc);
create index if not exists payment_transactions_subscription_idx
  on public.payment_transactions(subscription_id, created_at desc);

alter table public.payment_transactions enable row level security;
revoke all on public.payment_transactions from anon, authenticated;
grant select on public.payment_transactions to authenticated;
create policy payment_transactions_read_own on public.payment_transactions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Provider webhook IDs are recorded once to make callbacks idempotent.
create table if not exists private.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique(provider, provider_event_id)
);

-- Durable email/reminder queue for receipts, failed payments and manual renewal notices.
create table if not exists private.billing_notification_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'payment_receipt','payment_failed','renewal_reminder','subscription_activated',
    'subscription_cancelled','access_expiring'
  )),
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists billing_notifications_due_idx
  on private.billing_notification_queue(scheduled_for, id)
  where sent_at is null;

revoke all on private.payment_webhook_events from public, anon, authenticated;
revoke all on private.billing_notification_queue from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.payment_webhook_events, private.billing_notification_queue to service_role;
grant usage, select on all sequences in schema private to service_role;

grant all on public.billing_plans, public.payment_transactions to service_role;
grant usage, select on all sequences in schema public to service_role;
