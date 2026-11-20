-- SA eChamber partner portal schema
-- Applied to Supabase project itxxnhcjjiynrmivexcb on 2026-11-21.
-- Partner programme remains pending until the authorised Chamber login and go-live date are confirmed.

create schema if not exists private;

create table if not exists public.partner_programs (
 id uuid primary key default gen_random_uuid(),
 partner_name text not null,
 partner_slug text not null unique,
 referral_code text not null unique,
 partner_user_id uuid unique references auth.users(id) on delete set null,
 status text not null default 'pending' check (status in ('pending','active','suspended')),
 program_live_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.partner_referrals (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.partner_programs(id),
 referred_user_id uuid not null unique references auth.users(id) on delete cascade,
 referral_code text not null,
 registered_at timestamptz not null default now(),
 first_paid_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists partner_referrals_partner_idx on public.partner_referrals(partner_id,registered_at);

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
 status text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists partner_commission_partner_month_idx on public.partner_commission_ledger(partner_id,payment_month);

create table if not exists public.partner_monthly_statements (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.partner_programs(id),
 statement_month date not null,
 active_referred_sellers integer not null default 0,
 qualifying_revenue numeric(12,2) not null default 0,
 commission_total numeric(12,2) not null default 0,
 adjustment_total numeric(12,2) not null default 0,
 payment_due_date date not null,
 status text not null default 'prepared' check(status in ('prepared','approved','paid')),
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 unique(partner_id,statement_month)
);

insert into public.partner_programs(partner_name,partner_slug,referral_code,status)
values ('SA eChamber','saechamber','SAECHAMBER','pending')
on conflict (partner_slug) do nothing;

create or replace function private.capture_partner_referral()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_code text; v_partner_id uuid;
begin
 v_code := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code','')));
 if v_code = '' then return new; end if;
 select id into v_partner_id from public.partner_programs
 where upper(referral_code)=v_code and status='active' limit 1;
 if v_partner_id is not null then
  insert into public.partner_referrals(partner_id,referred_user_id,referral_code)
  values(v_partner_id,new.id,v_code) on conflict(referred_user_id) do nothing;
 end if;
 return new;
end;
$$;
drop trigger if exists on_auth_user_created_partner_referral on auth.users;
create trigger on_auth_user_created_partner_referral after insert on auth.users
for each row execute function private.capture_partner_referral();

create or replace function private.mark_partner_first_payment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if new.status='complete' and new.paid_at is not null then
  update public.partner_referrals set first_paid_at=coalesce(first_paid_at,new.paid_at)
  where referred_user_id=new.user_id;
 end if;
 return new;
end;
$$;
drop trigger if exists on_partner_payment_completed on public.payment_transactions;
create trigger on_partner_payment_completed after insert or update of status,paid_at
on public.payment_transactions for each row execute function private.mark_partner_first_payment();

create table if not exists public.partner_commission_rate_schedule (
 id bigserial primary key,
 partner_id uuid not null references public.partner_programs(id) on delete cascade,
 rate_type text not null check(rate_type in ('accelerator','sliding')),
 band smallint not null check(band between 1 and 4),
 agreement_plan text not null check(agreement_plan in ('beginner','starter','growth','pro')),
 commission_rate numeric(5,4) not null check(commission_rate between 0 and 0.20),
 effective_from date not null default current_date,
 effective_to date,
 created_at timestamptz not null default now(),
 unique(partner_id,rate_type,band,agreement_plan,effective_from)
);

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
on conflict(partner_id,rate_type,band,agreement_plan,effective_from) do nothing;

alter table public.partner_programs enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_commission_ledger enable row level security;
alter table public.partner_monthly_statements enable row level security;
alter table public.partner_commission_rate_schedule enable row level security;

drop policy if exists "Partners can view own program" on public.partner_programs;
create policy "Partners can view own program" on public.partner_programs
 for select to authenticated using (partner_user_id=(select auth.uid()));
drop policy if exists "Partners can view own referrals" on public.partner_referrals;
create policy "Partners can view own referrals" on public.partner_referrals
 for select to authenticated using (exists(select 1 from public.partner_programs p where p.id=partner_id and p.partner_user_id=(select auth.uid())));
drop policy if exists "Partners can view own commissions" on public.partner_commission_ledger;
create policy "Partners can view own commissions" on public.partner_commission_ledger
 for select to authenticated using (exists(select 1 from public.partner_programs p where p.id=partner_id and p.partner_user_id=(select auth.uid())));
drop policy if exists "Partners can view own statements" on public.partner_monthly_statements;
create policy "Partners can view own statements" on public.partner_monthly_statements
 for select to authenticated using (exists(select 1 from public.partner_programs p where p.id=partner_id and p.partner_user_id=(select auth.uid())));
drop policy if exists "Partners can view own commission rates" on public.partner_commission_rate_schedule;
create policy "Partners can view own commission rates" on public.partner_commission_rate_schedule
 for select to authenticated using (exists(select 1 from public.partner_programs p where p.id=partner_id and p.partner_user_id=(select auth.uid())));

revoke all on public.partner_programs,public.partner_referrals,public.partner_commission_ledger,public.partner_monthly_statements,public.partner_commission_rate_schedule from anon,authenticated;
grant select on public.partner_programs,public.partner_referrals,public.partner_commission_ledger,public.partner_monthly_statements,public.partner_commission_rate_schedule to authenticated;
grant all on public.partner_programs,public.partner_referrals,public.partner_commission_ledger,public.partner_monthly_statements,public.partner_commission_rate_schedule to service_role;
grant usage on schema private to postgres,service_role;
revoke all on function private.capture_partner_referral() from public,anon,authenticated;
revoke all on function private.mark_partner_first_payment() from public,anon,authenticated;
