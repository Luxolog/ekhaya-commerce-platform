-- Ekhaya Marketplace Price Checker: partner/referral foundation.
-- Apply after 0001_core_schema.sql. Payment events must be written by a trusted
-- server/webhook using the service role; never expose service-role credentials.

create type public.partner_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.partner_commission_status as enum ('pending', 'approved', 'paid', 'reversed');

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  contact_email text not null,
  phone text,
  channel_url text,
  audience_description text,
  promotion_plan text,
  status public.partner_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  application_id uuid references public.partner_applications(id),
  display_name text not null,
  referral_code text not null unique,
  commission_rate numeric(5,2) not null default 20.00 check (commission_rate > 0 and commission_rate <= 50),
  status public.partner_status not null default 'pending',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  referral_code text not null,
  landing_path text,
  anonymous_click_id text,
  clicked_at timestamptz not null default now()
);
create index partner_clicks_partner_date_idx on public.partner_referral_clicks(partner_id, clicked_at desc);

create table public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  referred_user_id uuid not null unique references auth.users(id) on delete restrict,
  referral_code text not null,
  first_clicked_at timestamptz,
  registered_at timestamptz not null default now(),
  first_paid_at timestamptz,
  commission_eligible_until timestamptz,
  status text not null default 'registered' check (status in ('registered', 'trial', 'paying', 'cancelled', 'expired', 'reversed')),
  created_at timestamptz not null default now()
);
create index partner_referrals_partner_date_idx on public.partner_referrals(partner_id, registered_at desc);

create table public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  referral_id uuid not null references public.partner_referrals(id) on delete restrict,
  payment_event_id text not null unique,
  subscription_id text,
  currency char(3) not null default 'ZAR',
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  vat_amount numeric(12,2) not null default 0 check (vat_amount >= 0),
  qualifying_amount numeric(12,2) generated always as (greatest(gross_amount - vat_amount, 0)) stored,
  commission_rate numeric(5,2) not null check (commission_rate > 0 and commission_rate <= 50),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status public.partner_commission_status not null default 'pending',
  earned_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  payout_reference text,
  reversal_reason text,
  created_at timestamptz not null default now()
);
create index partner_commissions_partner_status_idx on public.partner_commissions(partner_id, status, earned_at desc);

create table public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  amount numeric(12,2) not null check (amount >= 100),
  currency char(3) not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  bank_account_last4 char(4),
  payment_reference text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (partner_id, period_start, period_end)
);

create trigger partner_applications_set_updated_at before update on public.partner_applications
  for each row execute function public.set_updated_at();
create trigger partners_set_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

-- Trusted payment-webhook function. Unique event IDs make webhook retries idempotent.
create or replace function public.record_partner_commission(
  p_payment_event_id text,
  p_referred_user_id uuid,
  p_subscription_id text,
  p_gross_amount numeric,
  p_vat_amount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral public.partner_referrals%rowtype;
  v_partner public.partners%rowtype;
  v_commission_id uuid;
  v_amount numeric(12,2);
begin
  if auth.role() <> 'service_role' then raise exception 'Only trusted payment services may record commissions'; end if;
  if p_payment_event_id is null or length(trim(p_payment_event_id)) = 0 then raise exception 'Payment event ID is required'; end if;
  if p_gross_amount <= 0 or p_vat_amount < 0 or p_vat_amount > p_gross_amount then raise exception 'Invalid payment amounts'; end if;

  select * into v_referral from public.partner_referrals
    where referred_user_id = p_referred_user_id for update;
  if not found then return null; end if;
  select * into v_partner from public.partners
    where id = v_referral.partner_id and status = 'approved';
  if not found then return null; end if;

  if v_referral.commission_eligible_until is null then
    update public.partner_referrals
      set first_paid_at = coalesce(first_paid_at, now()),
          commission_eligible_until = coalesce(first_paid_at, now()) + interval '12 months',
          status = 'paying'
      where id = v_referral.id returning * into v_referral;
  end if;
  if now() > v_referral.commission_eligible_until
     or v_referral.status in ('cancelled', 'expired', 'reversed') then return null; end if;

  v_amount := round((p_gross_amount - p_vat_amount) * v_partner.commission_rate / 100, 2);
  insert into public.partner_commissions (
    partner_id, referral_id, payment_event_id, subscription_id,
    gross_amount, vat_amount, commission_rate, commission_amount
  ) values (
    v_partner.id, v_referral.id, p_payment_event_id, p_subscription_id,
    p_gross_amount, p_vat_amount, v_partner.commission_rate, v_amount
  ) on conflict (payment_event_id) do nothing returning id into v_commission_id;
  return v_commission_id;
end;
$$;

alter table public.platform_admins enable row level security;
alter table public.partner_applications enable row level security;
alter table public.partners enable row level security;
alter table public.partner_referral_clicks enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_commissions enable row level security;
alter table public.partner_payouts enable row level security;

create policy "users submit own partner application" on public.partner_applications
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users view own partner application" on public.partner_applications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "admins manage applications" on public.partner_applications
  for all to authenticated using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

create policy "partners view own profile" on public.partners for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admins manage partners" on public.partners for all to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

create policy "partners view own clicks" on public.partner_referral_clicks for select to authenticated
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = (select auth.uid())));
create policy "admins manage clicks" on public.partner_referral_clicks for all to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

create policy "partners view own referrals" on public.partner_referrals for select to authenticated
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = (select auth.uid())));
create policy "admins manage referrals" on public.partner_referrals for all to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

create policy "partners view own commissions" on public.partner_commissions for select to authenticated
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = (select auth.uid())));
create policy "admins manage commissions" on public.partner_commissions for all to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

create policy "partners view own payouts" on public.partner_payouts for select to authenticated
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = (select auth.uid())));
create policy "admins manage payouts" on public.partner_payouts for all to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

grant select, insert on public.partner_applications to authenticated;
grant select on public.partners, public.partner_referral_clicks, public.partner_referrals,
  public.partner_commissions, public.partner_payouts to authenticated;
grant execute on function public.record_partner_commission(text, uuid, text, numeric, numeric) to service_role;
