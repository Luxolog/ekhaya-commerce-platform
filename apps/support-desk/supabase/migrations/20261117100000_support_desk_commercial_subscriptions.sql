-- Ekhaya Support Desk commercial subscriptions and seat entitlements.
-- Additive only: existing Price Checker tables and data are untouched.
-- Existing workspaces are marked setup_required; they are not silently enrolled in a paid or expired trial.
-- New organisations receive a 30-day trial with two included seats.
-- Base monthly price is deliberately nullable until the owner confirms it.

create table if not exists public.sd_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references public.sd_organisations(id) on delete cascade,
  status text not null default 'setup_required'
    check (status in ('setup_required','trialing','active','past_due','canceled','expired')),
  billing_interval text not null default 'month' check (billing_interval = 'month'),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  included_seats integer not null default 2 check (included_seats = 2),
  paid_additional_seats integer not null default 0 check (paid_additional_seats >= 0),
  additional_seat_price_cents integer not null default 7500 check (additional_seat_price_cents = 7500),
  base_monthly_price_cents integer check (base_monthly_price_cents is null or base_monthly_price_cents >= 0),
  billing_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sd_subscription_trial_window check (
    trial_ends_at is null or trial_started_at is null or trial_ends_at > trial_started_at
  )
);

create unique index if not exists sd_subscriptions_provider_subscription_uidx
  on public.sd_subscriptions(billing_provider, provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.sd_subscription_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  subscription_id uuid references public.sd_subscriptions(id) on delete set null,
  event_type text not null,
  provider_event_id text,
  amount_cents integer,
  currency text not null default 'ZAR',
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists sd_subscription_events_provider_event_uidx
  on public.sd_subscription_events(provider_event_id)
  where provider_event_id is not null;
create index if not exists sd_subscription_events_org_date_idx
  on public.sd_subscription_events(organisation_id, occurred_at desc);

alter table public.sd_subscriptions enable row level security;
alter table public.sd_subscription_events enable row level security;

drop policy if exists sd_subscriptions_read_billing_admin on public.sd_subscriptions;
create policy sd_subscriptions_read_billing_admin
  on public.sd_subscriptions for select to authenticated
  using (private.sd_has_org_role(organisation_id, array['owner','admin']::text[]));

drop policy if exists sd_subscription_events_read_billing_admin on public.sd_subscription_events;
create policy sd_subscription_events_read_billing_admin
  on public.sd_subscription_events for select to authenticated
  using (private.sd_has_org_role(organisation_id, array['owner','admin']::text[]));

grant select on public.sd_subscriptions, public.sd_subscription_events to authenticated;
revoke insert, update, delete on public.sd_subscriptions, public.sd_subscription_events from authenticated, anon, public;

-- Automatically start a 30-day trial for each newly created organisation.
create or replace function private.sd_start_organisation_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.sd_subscriptions (
    organisation_id, status, trial_started_at, trial_ends_at,
    included_seats, paid_additional_seats, additional_seat_price_cents,
    billing_interval, currency
  ) values (
    new.id, 'trialing', now(), now() + interval '30 days',
    2, 0, 7500, 'month', 'ZAR'
  )
  on conflict (organisation_id) do nothing;
  return new;
end;
$$;

drop trigger if exists sd_organisation_start_trial on public.sd_organisations;
create trigger sd_organisation_start_trial
  after insert on public.sd_organisations
  for each row execute function private.sd_start_organisation_trial();

-- Existing organisations predate the commercial model. Require an explicit
-- onboarding decision rather than granting an already-expired historical trial.
insert into public.sd_subscriptions (organisation_id, status)
select o.id, 'setup_required'
from public.sd_organisations o
on conflict (organisation_id) do nothing;

-- Prevent owners/admins from inviting or activating more seats than their
-- included seats plus paid additional seats. Departments are intentionally uncapped.
create or replace function private.sd_enforce_organisation_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_included integer;
  v_paid integer;
  v_used integer;
begin
  if new.status not in ('active','invited') then
    return new;
  end if;

  select s.status, s.included_seats, s.paid_additional_seats
    into v_status, v_included, v_paid
  from public.sd_subscriptions s
  where s.organisation_id = new.organisation_id
  for update;

  if not found or v_status not in ('trialing','active') then
    raise exception 'This workspace does not currently have an active trial or subscription. Contact the workspace owner.'
      using errcode = '23514';
  end if;

  select count(*) into v_used
  from public.sd_organisation_members m
  where m.organisation_id = new.organisation_id
    and m.status in ('active','invited')
    and m.id is distinct from new.id;

  if v_used >= (v_included + v_paid) then
    raise exception 'User seat limit reached. Add a paid seat or change the subscription.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists sd_members_enforce_seat_limit on public.sd_organisation_members;
create trigger sd_members_enforce_seat_limit
  before insert or update of organisation_id, status
  on public.sd_organisation_members
  for each row execute function private.sd_enforce_organisation_seat_limit();

comment on table public.sd_subscriptions is
  'Per-organisation monthly subscription entitlement. Trial is 30 days; two included seats; each extra seat costs ZAR 75/month. Base fee awaits commercial approval.';
comment on column public.sd_subscriptions.base_monthly_price_cents is
  'NULL until the owner approves the monthly base price for the two included seats.';
comment on column public.sd_subscriptions.additional_seat_price_cents is
  'Fixed additional active/invited user price: ZAR 75 per seat per month.';
comment on table public.sd_departments is
  'Organisation departments are unlimited; department count does not consume user seats.';
