-- Batch 9: authoritative partner and payment-transaction foundation.
-- This migration is deliberately ordered before 20261121023000_public_active_referral_partners.sql.
-- Definitions below were reconciled against the read-only live PostgreSQL catalog and
-- the existing partner schema reference. No production database was modified while
-- preparing this migration.
--
-- IMPORTANT: this migration restores the partner/payment data model and partner
-- attribution invariants. The historical subscription billing/webhook migration
-- source is still incomplete in this repository; the full paid-credit allocation
-- workflow must be restored and tested separately before a production release.

create schema if not exists private;

-- The payment transaction is a real financial record, not a placeholder:
-- preserve its provider references, idempotency constraints and subscription link.
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_provider text not null default 'payfast',
  provider_payment_id text,
  merchant_reference text not null unique,
  payment_kind text not null check (payment_kind in ('introductory','renewal','manual_renewal','one_off')),
  billing_mode text not null check (billing_mode in ('manual','automatic')),
  amount numeric not null check (amount > 0),
  currency char(3) not null default 'ZAR',
  status text not null check (status in ('created','pending','complete','failed','cancelled','refunded')),
  paid_at timestamptz,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_provider_payment_unique unique (payment_provider, provider_payment_id)
);

create index if not exists payment_transactions_subscription_idx
  on public.payment_transactions(subscription_id, created_at desc);
create index if not exists payment_transactions_user_created_idx
  on public.payment_transactions(user_id, created_at desc);

-- Reconcile the subscription/payment contract used by the current Paystack
-- function. These definitions are catalog-verified; paid checkout remains
-- hard-disabled in the Edge Function until its separate release gate is opened.
alter table public.subscriptions
  add column if not exists billing_mode text not null default 'manual',
  add column if not exists intro_price numeric not null default 49.00,
  add column if not exists renewal_amount numeric,
  add column if not exists intro_payment_completed_at timestamptz,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancelled_at timestamptz;

alter table public.subscriptions drop constraint if exists subscriptions_plan_code_check;
alter table public.subscriptions add constraint subscriptions_plan_code_check
  check (plan_code in ('starter','growth','pro','business'));
alter table public.subscriptions drop constraint if exists subscriptions_billing_mode_check;
alter table public.subscriptions add constraint subscriptions_billing_mode_check
  check (billing_mode in ('manual','automatic'));
alter table public.subscriptions drop constraint if exists subscriptions_intro_price_check;
alter table public.subscriptions add constraint subscriptions_intro_price_check
  check (intro_price >= 0);
alter table public.subscriptions drop constraint if exists subscriptions_renewal_amount_check;
alter table public.subscriptions add constraint subscriptions_renewal_amount_check
  check (renewal_amount is null or renewal_amount > 0);

create index if not exists subscriptions_due_idx
  on public.subscriptions(status, current_period_end)
  where status in ('active','past_due');

alter table public.profiles drop constraint if exists profiles_plan_code_check;
alter table public.profiles add constraint profiles_plan_code_check
  check (plan_code in ('free','starter','growth','pro','business'));

create table if not exists public.billing_plans (
  code text primary key check (code in ('starter','growth','pro','business')),
  name text not null,
  intro_price numeric not null default 0 check (intro_price >= 0),
  monthly_price numeric not null check (monthly_price > 0),
  currency char(3) not null default 'ZAR',
  is_active boolean not null default true,
  display_order smallint not null,
  updated_at timestamptz not null default now()
);

insert into public.billing_plans(code,name,intro_price,monthly_price,currency,is_active,display_order)
values
  ('starter','Starter',0,99,'ZAR',true,1),
  ('growth','Growth',0,149,'ZAR',true,2),
  ('pro','Pro',0,199,'ZAR',true,3),
  ('business','Business',0,299,'ZAR',false,4)
on conflict (code) do update set
  name=excluded.name,
  intro_price=excluded.intro_price,
  monthly_price=excluded.monthly_price,
  currency=excluded.currency,
  is_active=excluded.is_active,
  display_order=excluded.display_order,
  updated_at=now();

insert into public.plan_search_allowances(plan_code,monthly_search_credits)
values
  ('starter',50),('growth',100),('pro',250),('business',350)
on conflict (plan_code) do update set
  monthly_search_credits=excluded.monthly_search_credits,
  updated_at=now();

create table if not exists public.search_credit_allocations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_transaction_id uuid references public.payment_transactions(id) on delete set null,
  plan_code text not null check (plan_code in ('starter','growth','pro','business')),
  source_reference text not null unique,
  credits_allocated integer not null check (credits_allocated > 0),
  credits_available integer not null check (credits_available >= 0),
  credits_reserved integer not null default 0 check (credits_reserved >= 0),
  credits_consumed integer not null default 0 check (credits_consumed >= 0),
  allocated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint search_credit_allocation_reconciles
    check (credits_allocated = credits_available + credits_reserved + credits_consumed)
);
create index if not exists search_credit_allocations_user_fifo_idx
  on public.search_credit_allocations(user_id, allocated_at, id)
  where credits_available > 0;

alter table public.billing_plans enable row level security;
alter table public.search_credit_allocations enable row level security;
revoke all on public.billing_plans from anon, authenticated;
grant select on public.billing_plans to anon, authenticated;
grant all on public.billing_plans to service_role;
revoke all on public.search_credit_allocations from anon, authenticated;
grant select on public.search_credit_allocations to authenticated;
grant all on public.search_credit_allocations to service_role;
grant usage, select on sequence public.search_credit_allocations_id_seq to service_role;

drop policy if exists billing_plans_read_active on public.billing_plans;
create policy billing_plans_read_active on public.billing_plans
  for select to anon, authenticated using (is_active);
drop policy if exists search_credit_allocations_read_own on public.search_credit_allocations;
create policy search_credit_allocations_read_own on public.search_credit_allocations
  for select to authenticated using ((select auth.uid()) = user_id);

-- Current live profile contract permits inactive partner accounts. The original
-- 0003 profile check did not; align the check before the partner exclusion trigger.
alter table public.profiles
  drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('pending','active','inactive','suspended'));

create table if not exists public.partner_programs (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  partner_slug text not null unique,
  referral_code text not null unique,
  partner_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','active','suspended')),
  program_live_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile existing installations too: new programmes must default to pending.
alter table public.partner_programs alter column status set default 'pending';

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_programs(id),
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  registered_at timestamptz not null default now(),
  first_paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists partner_referrals_partner_idx
  on public.partner_referrals(partner_id, registered_at);

create table if not exists public.partner_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_programs(id),
  referral_id uuid not null references public.partner_referrals(id),
  referred_user_id uuid not null references auth.users(id),
  payment_transaction_id uuid not null unique references public.payment_transactions(id),
  payment_month date not null,
  plan_code text not null,
  qualifying_amount numeric(12,2) not null check (qualifying_amount >= 0),
  active_referred_sellers integer not null check (active_referred_sellers >= 1),
  commission_band smallint not null check (commission_band between 1 and 4),
  commission_rate numeric(5,4) not null check (commission_rate between 0 and 0.20),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending','approved','paid','reversed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists partner_commission_partner_month_idx
  on public.partner_commission_ledger(partner_id, payment_month);

create table if not exists public.partner_monthly_statements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_programs(id),
  statement_month date not null,
  active_referred_sellers integer not null default 0,
  qualifying_revenue numeric(12,2) not null default 0,
  commission_total numeric(12,2) not null default 0,
  adjustment_total numeric(12,2) not null default 0,
  payment_due_date date not null,
  status text not null default 'prepared'
    check (status in ('prepared','approved','paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (partner_id, statement_month)
);

create table if not exists public.partner_commission_rate_schedule (
  id bigserial primary key,
  partner_id uuid not null references public.partner_programs(id) on delete cascade,
  rate_type text not null check (rate_type in ('accelerator','sliding')),
  band smallint not null check (band between 1 and 4),
  agreement_plan text not null check (agreement_plan in ('beginner','starter','growth','pro')),
  commission_rate numeric(5,4) not null check (commission_rate between 0 and 0.20),
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  unique (partner_id, rate_type, band, agreement_plan, effective_from)
);

create table if not exists public.partner_owner_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_programs(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','accepted','expired','revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  contact_name text,
  unique (partner_id, invited_email)
);
create index if not exists partner_invitations_partner_invited_at_idx
  on public.partner_invitations(partner_id, invited_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  notification_type text not null,
  title text not null,
  message text not null,
  action_url text,
  email_status text not null default 'not_requested'
    check (email_status in ('not_requested','pending','sent','failed','skipped')),
  email_error text,
  email_sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  email_attempted_at timestamptz,
  constraint user_notifications_event_key_unique unique (user_id, event_key)
);
create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id, created_at desc)
  where read_at is null;

-- Preserve the existing referral/payment integrity guards.
create or replace function private.capture_partner_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text;
  v_partner_id uuid;
  v_partner_user_id uuid;
  v_partner_name text;
  v_referral_id uuid;
  v_seller_name text;
  v_registered_at text;
begin
  if new.email is null
     or coalesce(new.raw_app_meta_data->>'role', 'seller') = 'owner' then
    return new;
  end if;

  if lower(coalesce(new.raw_user_meta_data->>'referral_method', '')) <> 'unique_link' then
    return new;
  end if;

  v_code := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  if v_code = '' then return new; end if;

  select p.id, p.partner_user_id, p.partner_name
    into v_partner_id, v_partner_user_id, v_partner_name
  from public.partner_programs p
  where upper(p.referral_code) = v_code and p.status = 'active'
  limit 1;

  if v_partner_id is null then return new; end if;

  insert into public.partner_referrals(partner_id, referred_user_id, referral_code)
  values (v_partner_id, new.id, v_code)
  on conflict (referred_user_id) do nothing
  returning id into v_referral_id;

  if v_referral_id is not null and v_partner_user_id is not null then
    v_seller_name := coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      'A new seller'
    );
    v_registered_at := to_char(now() at time zone 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI') || ' SAST';

    insert into public.user_notifications
      (user_id, event_key, notification_type, title, message, action_url, email_status)
    values (
      v_partner_user_id,
      'partner-referral:new:' || v_referral_id::text,
      'partner_referral',
      'A new seller registered through your partner link',
      'A new seller has registered through your unique Ekhaya partner referral link.'
        || E'\n\nPartner: ' || coalesce(v_partner_name, 'Your partner programme')
        || E'\nSeller: ' || v_seller_name
        || E'\nRegistered: ' || v_registered_at
        || E'\nReferral status: Pending review'
        || E'\n\nThis is a signup notification only. It does not accept the referral or create a commission. Sign in to your Partner Portal to review the referral.',
      'https://ekhayatech.co.za/partner/',
      'pending'
    )
    on conflict (user_id, event_key) do nothing;
  end if;
  return new;
end;
$function$;

create or replace function public.grant_paid_search_credits(
  p_user_id uuid,
  p_plan_code text,
  p_credits integer,
  p_source_reference text,
  p_payment_transaction_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id bigint;
begin
  if p_user_id is null or p_plan_code not in ('starter','growth','pro','business')
     or p_credits is null or p_credits <= 0
     or p_source_reference is null or length(trim(p_source_reference)) = 0 then
    raise exception 'Invalid paid credit allocation request';
  end if;

  insert into public.search_credit_allocations
    (user_id,payment_transaction_id,plan_code,source_reference,credits_allocated,credits_available)
  values
    (p_user_id,p_payment_transaction_id,p_plan_code,p_source_reference,p_credits,p_credits)
  on conflict (source_reference) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.search_credit_allocations
    where source_reference=p_source_reference
      and user_id=p_user_id
      and credits_allocated=p_credits
      and plan_code=p_plan_code;
    if v_id is null then
      raise exception 'Allocation reference already exists with different details';
    end if;
    return jsonb_build_object('allocated',false,'duplicate',true,'allocation_id',v_id);
  end if;

  return jsonb_build_object('allocated',true,'duplicate',false,'allocation_id',v_id,
    'credits',p_credits,'expires_at',null);
end;
$function$;

create or replace function private.allocate_search_credits_after_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_plan text;
  v_credits integer;
begin
  if new.status <> 'complete' or new.subscription_id is null then
    return new;
  end if;

  select s.plan_code into v_plan
  from public.subscriptions s
  where s.id=new.subscription_id and s.user_id=new.user_id;

  if v_plan is null then return new; end if;

  select a.monthly_search_credits into v_credits
  from public.plan_search_allowances a
  where a.plan_code=v_plan;

  if coalesce(v_credits,0) <= 0 then
    raise exception 'No paid search-credit allowance configured for plan %', v_plan;
  end if;

  perform public.grant_paid_search_credits(
    new.user_id,v_plan,v_credits,'payment:' || new.id::text,new.id
  );
  return new;
end;
$function$;

revoke all on function public.grant_paid_search_credits(uuid,text,integer,text,uuid)
  from public,anon,authenticated;
grant execute on function public.grant_paid_search_credits(uuid,text,integer,text,uuid)
  to service_role;

create or replace function private.mark_partner_first_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'complete' and new.paid_at is not null then
    update public.partner_referrals
    set first_paid_at = coalesce(first_paid_at, new.paid_at)
    where referred_user_id = new.user_id;
  end if;
  return new;
end;
$function$;

create or replace function private.prevent_partner_self_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1 from public.partner_programs pp
    where pp.id = new.partner_id and pp.partner_user_id = new.referred_user_id
  ) then
    return null;
  end if;
  return new;
end;
$function$;

create or replace function private.prevent_partner_owner_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1 from public.partner_programs pp
    where pp.id = new.partner_id and pp.partner_user_id = new.referred_user_id
  ) then
    return null;
  end if;
  return new;
end;
$function$;

create or replace function private.deactivate_partner_seller_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.partner_user_id is not null then
    update public.profiles
       set account_status = 'inactive',
           updated_at = now()
     where id = new.partner_user_id
       and account_status <> 'inactive';
  end if;
  return new;
end;
$function$;

create or replace function private.notify_partner_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_partner_name text;
  v_referral_code text;
  v_partner_user_id uuid;
  v_accepted_sast text;
  v_linked_email text;
  v_contact_name text;
  v_owner_message text;
  v_partner_message text;
begin
  if new.status is distinct from 'accepted'
     or old.status is not distinct from 'accepted' then
    return new;
  end if;

  select p.partner_name, p.referral_code, p.partner_user_id
    into v_partner_name, v_referral_code, v_partner_user_id
  from public.partner_programs p where p.id = new.partner_id;

  if v_partner_name is null then
    raise warning 'Partner invitation % accepted but partner programme % was not found', new.id, new.partner_id;
    return new;
  end if;

  if v_partner_user_id is not null then
    select u.email into v_linked_email from auth.users u where u.id = v_partner_user_id;
  end if;

  v_contact_name := coalesce(nullif(trim(new.contact_name), ''), 'Partner contact');
  v_accepted_sast := to_char(
    coalesce(new.accepted_at, now()) at time zone 'Africa/Johannesburg',
    'DD Mon YYYY HH24:MI:SS'
  ) || ' SAST';

  v_owner_message :=
    'Partner organisation: ' || v_partner_name ||
    E'\nPartner contact: ' || v_contact_name ||
    E'\nContact email: ' || new.invited_email ||
    E'\nReferral code: ' || coalesce(v_referral_code, 'Not set') ||
    E'\nAccepted date and time: ' || v_accepted_sast ||
    E'\nLinked Ekhaya account ID: ' || coalesce(v_partner_user_id::text, 'Not linked') ||
    E'\nLinked account email: ' || coalesce(v_linked_email, 'Unavailable') ||
    E'\nConfirmation: The existing partner account is linked.';

  v_partner_message :=
    'Your partner invitation has been accepted.' ||
    E'\nPartner organisation: ' || v_partner_name ||
    E'\nYour existing Ekhaya account is now linked.' ||
    E'\nOrganisation referral code: ' || coalesce(v_referral_code, 'Being finalised') ||
    E'\nAccepted date and time: ' || v_accepted_sast ||
    E'\nAccepted by: ' || v_contact_name || ' (' || new.invited_email || ')' ||
    E'\nLinked Ekhaya account: ' || coalesce(v_linked_email, 'Account linked; email unavailable') ||
    E'\nFor assistance, contact support@ekhayatech.co.za.';

  if new.invited_by is not null then
    insert into public.user_notifications
      (user_id, event_key, notification_type, title, message, email_status)
    values (
      new.invited_by,
      'partner-invitation-accepted:owner:' || new.id::text,
      'system',
      v_partner_name || ' accepted the partner invitation',
      v_owner_message,
      'pending'
    )
    on conflict (user_id, event_key) do nothing;
  end if;

  if v_partner_user_id is not null then
    insert into public.user_notifications
      (user_id, event_key, notification_type, title, message, email_status)
    values (
      v_partner_user_id,
      'partner-invitation-accepted:welcome:' || new.id::text,
      'system',
      'Welcome to the Ekhaya Technologies Partner Programme',
      v_partner_message,
      'pending'
    )
    on conflict (user_id, event_key) do nothing;
  end if;
  return new;
end;
$function$;

create or replace function private.queue_payment_status_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_title text;
  v_message text;
  v_key text;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'complete' then
    v_title := 'Payment received — thank you';
    v_message := 'We have successfully confirmed your Ekhaya Price Checker payment.' || E'\n\n'
      || 'Amount: R' || to_char(new.amount,'FM999999990.00') || E'\n'
      || 'Payment type: ' || replace(coalesce(new.payment_kind,'payment'),'_',' ') || E'\n'
      || 'Reference: ' || coalesce(new.merchant_reference,new.provider_payment_id,'Not provided') || E'\n\n'
      || 'Your account or subscription will reflect the confirmed payment according to the payment processing workflow.';
    v_key := 'payment:complete:' || new.id::text;
  elsif new.status = 'failed' then
    v_title := 'Your Ekhaya payment was not successful';
    v_message := 'We could not confirm your Ekhaya Price Checker payment.' || E'\n\n'
      || 'Amount: R' || to_char(new.amount,'FM999999990.00') || E'\n'
      || 'Payment type: ' || replace(coalesce(new.payment_kind,'payment'),'_',' ') || E'\n'
      || 'Reference: ' || coalesce(new.merchant_reference,new.provider_payment_id,'Not provided') || E'\n\n'
      || 'Please return to your billing page and try again. If your account was debited, contact support before making another payment.';
    v_key := 'payment:failed:' || new.id::text;
  else
    return new;
  end if;

  insert into public.user_notifications
    (user_id,event_key,notification_type,title,message,action_url,email_status)
  values
    (new.user_id,v_key,'payment_status',v_title,v_message,
     'https://pricechecker.ekhayatech.co.za/account/','pending')
  on conflict (user_id,event_key) do nothing;
  return new;
end;
$function$;

-- The programme is intentionally NOT auto-activated on insert. The current
-- owner workflow creates pending programmes and activates only after invitation
-- acceptance. Remove the conflicting legacy trigger if this migration is applied
-- to a database that already contains it; do not remove any other activation logic.
drop trigger if exists ensure_partner_program_active_before_insert on public.partner_programs;

-- Install triggers idempotently so the migration can reconcile an existing schema.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname='on_auth_user_created_partner_referral' and tgrelid='auth.users'::regclass and not tgisinternal) then
    create trigger on_auth_user_created_partner_referral
      after insert on auth.users for each row execute function private.capture_partner_referral();
  end if;
  if not exists (select 1 from pg_trigger where tgname='allocate_search_credits_on_payment_complete' and tgrelid='public.payment_transactions'::regclass and not tgisinternal) then
    create trigger allocate_search_credits_on_payment_complete
      after insert or update on public.payment_transactions
      for each row execute function private.allocate_search_credits_after_payment();
  end if;
  if not exists (select 1 from pg_trigger where tgname='on_partner_payment_completed' and tgrelid='public.payment_transactions'::regclass and not tgisinternal) then
    create trigger on_partner_payment_completed
      after insert or update of status, paid_at on public.payment_transactions
      for each row execute function private.mark_partner_first_payment();
  end if;
  if not exists (select 1 from pg_trigger where tgname='prevent_partner_self_referral' and tgrelid='public.partner_referrals'::regclass and not tgisinternal) then
    create trigger prevent_partner_self_referral
      before insert or update on public.partner_referrals
      for each row execute function private.prevent_partner_self_referral();
  end if;
  if not exists (select 1 from pg_trigger where tgname='prevent_partner_owner_commission' and tgrelid='public.partner_commission_ledger'::regclass and not tgisinternal) then
    create trigger prevent_partner_owner_commission
      before insert or update on public.partner_commission_ledger
      for each row execute function private.prevent_partner_owner_commission();
  end if;
  if not exists (select 1 from pg_trigger where tgname='deactivate_partner_seller_profile' and tgrelid='public.partner_programs'::regclass and not tgisinternal) then
    create trigger deactivate_partner_seller_profile
      after insert or update on public.partner_programs
      for each row execute function private.deactivate_partner_seller_profile();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_notify_partner_invitation_accepted' and tgrelid='public.partner_invitations'::regclass and not tgisinternal) then
    create trigger trg_notify_partner_invitation_accepted
      after update on public.partner_invitations
      for each row execute function private.notify_partner_invitation_accepted();
  end if;
  if not exists (select 1 from pg_trigger where tgname='notify_payment_status' and tgrelid='public.payment_transactions'::regclass and not tgisinternal) then
    create trigger notify_payment_status
      after update of status on public.payment_transactions
      for each row execute function private.queue_payment_status_notification();
  end if;
end $$;

-- SA eChamber is the original programme. The insert is safe on databases where it
-- already exists; no owner access or partner user is fabricated.
insert into public.partner_programs(partner_name,partner_slug,referral_code,status)
values ('SA eChamber','saechamber','SAECHAMBER','pending')
on conflict (partner_slug) do nothing;

insert into public.partner_commission_rate_schedule(partner_id,rate_type,band,agreement_plan,commission_rate)
select p.id,x.rate_type,x.band,x.agreement_plan,x.rate
from public.partner_programs p
cross join (values
  ('accelerator',1,'beginner',0.13),('accelerator',1,'starter',0.15),('accelerator',1,'growth',0.18),('accelerator',1,'pro',0.18),
  ('sliding',1,'beginner',0.10),('sliding',1,'starter',0.12),('sliding',1,'growth',0.15),('sliding',1,'pro',0.15),
  ('sliding',2,'beginner',0.15),('sliding',2,'starter',0.15),('sliding',2,'growth',0.18),('sliding',2,'pro',0.18),
  ('sliding',3,'beginner',0.18),('sliding',3,'starter',0.18),('sliding',3,'growth',0.20),('sliding',3,'pro',0.20),
  ('sliding',4,'beginner',0.20),('sliding',4,'starter',0.20),('sliding',4,'growth',0.20),('sliding',4,'pro',0.20)
) as x(rate_type,band,agreement_plan,rate)
where p.partner_slug='saechamber'
on conflict (partner_id,rate_type,band,agreement_plan,effective_from) do nothing;

-- RLS and grants: authenticated clients receive only their own read surfaces;
-- privileged writes remain service-role only.
alter table public.payment_transactions enable row level security;
alter table public.partner_programs enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_commission_ledger enable row level security;
alter table public.partner_monthly_statements enable row level security;
alter table public.partner_commission_rate_schedule enable row level security;
alter table public.partner_owner_access enable row level security;
alter table public.partner_invitations enable row level security;
alter table public.user_notifications enable row level security;

revoke all on public.payment_transactions, public.partner_programs, public.partner_referrals,
  public.partner_commission_ledger, public.partner_monthly_statements,
  public.partner_commission_rate_schedule, public.partner_owner_access,
  public.partner_invitations, public.user_notifications from anon, authenticated;

grant select on public.payment_transactions, public.partner_programs, public.partner_referrals,
  public.partner_commission_ledger, public.partner_monthly_statements,
  public.partner_commission_rate_schedule, public.partner_owner_access,
  public.partner_invitations to authenticated;
grant select, update(read_at) on public.user_notifications to authenticated;

grant all on public.payment_transactions, public.partner_programs, public.partner_referrals,
  public.partner_commission_ledger, public.partner_monthly_statements,
  public.partner_commission_rate_schedule, public.partner_owner_access,
  public.partner_invitations, public.user_notifications to service_role;
grant usage, select on sequence public.partner_commission_rate_schedule_id_seq to service_role;
grant usage on schema private to service_role;

drop policy if exists payment_transactions_read_own on public.payment_transactions;
create policy payment_transactions_read_own on public.payment_transactions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Ekhaya owners can view partner programs" on public.partner_programs;
create policy "Ekhaya owners can view partner programs" on public.partner_programs
  for select to authenticated using (exists (
    select 1 from public.partner_owner_access a where a.user_id = (select auth.uid())
  ));
drop policy if exists "Partners can view own program" on public.partner_programs;
create policy "Partners can view own program" on public.partner_programs
  for select to authenticated using (partner_user_id = (select auth.uid()));

drop policy if exists "Ekhaya owners can view partner referrals" on public.partner_referrals;
create policy "Ekhaya owners can view partner referrals" on public.partner_referrals
  for select to authenticated using (exists (
    select 1 from public.partner_owner_access a where a.user_id = (select auth.uid())
  ));
drop policy if exists "Partners can view own referrals" on public.partner_referrals;
create policy "Partners can view own referrals" on public.partner_referrals
  for select to authenticated using (exists (
    select 1 from public.partner_programs p
    where p.id = partner_referrals.partner_id and p.partner_user_id = (select auth.uid())
  ));

drop policy if exists "Ekhaya owners can view partner commissions" on public.partner_commission_ledger;
create policy "Ekhaya owners can view partner commissions" on public.partner_commission_ledger
  for select to authenticated using (exists (
    select 1 from public.partner_owner_access a where a.user_id = (select auth.uid())
  ));
drop policy if exists "Partners can view own commissions" on public.partner_commission_ledger;
create policy "Partners can view own commissions" on public.partner_commission_ledger
  for select to authenticated using (exists (
    select 1 from public.partner_programs p
    where p.id = partner_commission_ledger.partner_id and p.partner_user_id = (select auth.uid())
  ));

drop policy if exists "Ekhaya owners can view partner statements" on public.partner_monthly_statements;
create policy "Ekhaya owners can view partner statements" on public.partner_monthly_statements
  for select to authenticated using (exists (
    select 1 from public.partner_owner_access a where a.user_id = (select auth.uid())
  ));
drop policy if exists "Partners can view own statements" on public.partner_monthly_statements;
create policy "Partners can view own statements" on public.partner_monthly_statements
  for select to authenticated using (exists (
    select 1 from public.partner_programs p
    where p.id = partner_monthly_statements.partner_id and p.partner_user_id = (select auth.uid())
  ));

drop policy if exists "Ekhaya owners can view partner rates" on public.partner_commission_rate_schedule;
create policy "Ekhaya owners can view partner rates" on public.partner_commission_rate_schedule
  for select to authenticated using (exists (
    select 1 from public.partner_owner_access a where a.user_id = (select auth.uid())
  ));
drop policy if exists "Partners can view own commission rates" on public.partner_commission_rate_schedule;
create policy "Partners can view own commission rates" on public.partner_commission_rate_schedule
  for select to authenticated using (exists (
    select 1 from public.partner_programs p
    where p.id = partner_commission_rate_schedule.partner_id and p.partner_user_id = (select auth.uid())
  ));

drop policy if exists "Owners can read own owner access" on public.partner_owner_access;
create policy "Owners can read own owner access" on public.partner_owner_access
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Ekhaya owners can view partner invitations" on public.partner_invitations;
create policy "Ekhaya owners can view partner invitations" on public.partner_invitations
  for select to authenticated using (exists (
    select 1 from public.partner_owner_access a where a.user_id = (select auth.uid())
  ));

drop policy if exists "Users can read their own notifications" on public.user_notifications;
create policy "Users can read their own notifications" on public.user_notifications
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can mark their own notifications read" on public.user_notifications;
create policy "Users can mark their own notifications read" on public.user_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on function private.allocate_search_credits_after_payment() from public, anon, authenticated;
grant execute on function private.allocate_search_credits_after_payment() to service_role;
revoke all on function private.capture_partner_referral() from public, anon, authenticated;
revoke all on function private.mark_partner_first_payment() from public, anon, authenticated;
revoke all on function private.prevent_partner_self_referral() from public, anon, authenticated;
revoke all on function private.prevent_partner_owner_commission() from public, anon, authenticated;
revoke all on function private.deactivate_partner_seller_profile() from public, anon, authenticated;
revoke all on function private.notify_partner_invitation_accepted() from public, anon, authenticated;
revoke all on function private.queue_payment_status_notification() from public, anon, authenticated;

comment on table public.payment_transactions is
  'Authoritative payment transaction ledger. Provider webhook lifecycle and paid-credit allocation functions are maintained separately.';
comment on table public.partner_commission_ledger is
  'Immutable-by-policy partner commission records linked one-to-one to the qualifying payment transaction.';
