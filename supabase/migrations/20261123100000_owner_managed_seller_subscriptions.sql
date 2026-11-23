-- Owner-managed subscription overrides are applied atomically after OTP verification.
create or replace function public.owner_set_seller_plan(
  p_user_id uuid,
  p_plan_code text
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

  if p_plan_code = 'free' then
    v_allowance := 5;
  else
    select monthly_search_credits into v_allowance
    from public.plan_search_allowances
    where plan_code = p_plan_code;
  end if;

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

revoke all on function public.owner_set_seller_plan(uuid,text) from public, anon, authenticated;
grant execute on function public.owner_set_seller_plan(uuid,text) to service_role;
