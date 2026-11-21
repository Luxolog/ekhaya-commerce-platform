-- Optional email OTP for privileged Partner and Admin sessions.
-- Tables are service-role only; clients cannot read or modify challenges or settings directly.
create table if not exists public.account_security_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_otp_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.account_security_settings enable row level security;
revoke all on public.account_security_settings from anon, authenticated;
grant all on public.account_security_settings to service_role;

create table if not exists public.email_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index if not exists email_otp_challenges_user_session_idx
  on public.email_otp_challenges(user_id, session_id, created_at desc);
alter table public.email_otp_challenges enable row level security;
revoke all on public.email_otp_challenges from anon, authenticated;
grant all on public.email_otp_challenges to service_role;

create table if not exists public.email_otp_verified_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, session_id)
);
alter table public.email_otp_verified_sessions enable row level security;
revoke all on public.email_otp_verified_sessions from anon, authenticated;
grant all on public.email_otp_verified_sessions to service_role;

create or replace function private.email_otp_gate_passed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not coalesce((
      select s.email_otp_enabled
      from public.account_security_settings s
      where s.user_id = (select auth.uid())
    ), false)
    or exists (
      select 1
      from public.email_otp_verified_sessions v
      where v.user_id = (select auth.uid())
        and v.session_id::text = ((select auth.jwt())->>'session_id')
        and v.expires_at > now()
    );
$$;
revoke all on function private.email_otp_gate_passed() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.email_otp_gate_passed() to authenticated;

-- Restrictive policies layer on top of existing partner/owner row ownership rules.
-- They do not grant access; they only deny access to opted-in accounts until the
-- current Supabase session has completed email OTP.
do $$
declare
  t text;
begin
  foreach t in array array[
    'partner_owner_access',
    'partner_programs',
    'partner_referrals',
    'partner_commission_ledger',
    'partner_monthly_statements',
    'partner_commission_rate_schedule',
    'partner_invitations'
  ] loop
    execute format(
      'drop policy if exists %I on public.%I',
      'email_otp_required_for_privileged_session',
      t
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (private.email_otp_gate_passed()) with check (private.email_otp_gate_passed())',
      'email_otp_required_for_privileged_session',
      t
    );
  end loop;
end $$;
