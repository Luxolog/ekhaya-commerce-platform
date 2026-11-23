-- Bind owner plan-change OTPs to the exact seller and selected plan.
alter table public.email_otp_challenges
  add column if not exists purpose text,
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists plan_code text;
alter table public.email_otp_verified_sessions
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists plan_code text;

-- The monthly entitlement function reads this table for every seller plan.
-- Include every plan exposed by the owner dashboard, including Growth.
alter table public.plan_search_allowances
  drop constraint if exists plan_search_allowances_plan_code_check;
alter table public.plan_search_allowances
  add constraint plan_search_allowances_plan_code_check
  check (plan_code in ('free','starter','growth','pro','business'));

insert into public.plan_search_allowances(plan_code, monthly_search_credits)
values
  ('free', 5),
  ('starter', 50),
  ('growth', 100),
  ('pro', 250),
  ('business', 350)
on conflict (plan_code) do update
set monthly_search_credits = excluded.monthly_search_credits,
    updated_at = now();

-- Consume the exact seller/plan OTP and apply the subscription in one transaction.
create or replace function public.owner_set_seller_plan(
  p_user_id uuid,
  p_plan_code text,
  p_owner_id uuid,
  p_session_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowance integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if p_plan_code not in ('free','starter','growth','pro','business') then
    raise exception 'INVALID_PLAN';
  end if;

  delete from public.email_otp_verified_sessions
  where user_id = p_owner_id
    and session_id = p_session_id
    and target_user_id = p_user_id
    and plan_code = p_plan_code
    and expires_at > now();
  if not found then
    raise exception 'OWNER_PLAN_CHANGE_OTP_REQUIRED';
  end if;

  select monthly_search_credits into v_allowance
  from public.plan_search_allowances
  where plan_code = p_plan_code;

  if v_allowance is null then
    raise exception 'PLAN_ALLOWANCE_NOT_CONFIGURED';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'SELLER_NOT_FOUND';
  end if;

  v_period_start := date_trunc('month', now());
  v_period_end := v_period_start + interval '1 month';

  update public.profiles
  set plan_code = p_plan_code, updated_at = now()
  where id = p_user_id;

  update public.subscriptions
  set status = 'cancelled', updated_at = now()
  where user_id = p_user_id and status in ('pending','active','past_due');

  if p_plan_code <> 'free' then
    insert into public.subscriptions(
      user_id, payment_provider, provider_subscription_id, plan_code, status,
      current_period_start, current_period_end, billing_mode, intro_price
    ) values (
      p_user_id, 'manual_owner', gen_random_uuid()::text, p_plan_code, 'active',
      v_period_start, v_period_end, 'manual', 0
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'plan_code', p_plan_code,
    'monthly_search_allowance', v_allowance,
    'activated_immediately', true,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
end;
$$;

revoke all on function public.owner_set_seller_plan(uuid,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.owner_set_seller_plan(uuid,text,uuid,uuid) to service_role;
