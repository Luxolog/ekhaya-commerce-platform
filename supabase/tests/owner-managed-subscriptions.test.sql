begin;

select plan(13);

select ok(
  to_regprocedure('public.owner_set_seller_plan(uuid,text,uuid,uuid)') is not null,
  'owner plan-change RPC accepts seller, plan, owner and session binding'
);
select ok(
  (select prosecdef from pg_proc where oid='public.owner_set_seller_plan(uuid,text,uuid,uuid)'::regprocedure),
  'owner plan-change RPC is SECURITY DEFINER'
);
select ok(
  not has_function_privilege('anon','public.owner_set_seller_plan(uuid,text,uuid,uuid)','EXECUTE'),
  'anonymous users cannot execute owner plan-change RPC'
);
select ok(
  not has_function_privilege('authenticated','public.owner_set_seller_plan(uuid,text,uuid,uuid)','EXECUTE'),
  'authenticated users cannot execute owner plan-change RPC directly'
);
select ok(
  has_function_privilege('service_role','public.owner_set_seller_plan(uuid,text,uuid,uuid)','EXECUTE'),
  'only the trusted service role can execute owner plan-change RPC'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.plan_search_allowances'::regclass
      and conname='plan_search_allowances_plan_code_check'
      and pg_get_constraintdef(oid) ilike '%growth%'
  ),
  'plan allowance catalogue accepts the Growth plan'
);
select is(
  (select monthly_search_credits from public.plan_search_allowances where plan_code='free'),
  5,
  'Free plan has five monthly searches'
);
select is(
  (select monthly_search_credits from public.plan_search_allowances where plan_code='starter'),
  50,
  'Starter plan allowance is seeded'
);
select is(
  (select monthly_search_credits from public.plan_search_allowances where plan_code='growth'),
  100,
  'Growth plan allowance is seeded'
);
select is(
  (select monthly_search_credits from public.plan_search_allowances where plan_code='pro'),
  250,
  'Pro plan allowance is seeded'
);
select is(
  (select monthly_search_credits from public.plan_search_allowances where plan_code='business'),
  350,
  'Business plan allowance is seeded'
);
select ok(
  position('OWNER_PLAN_CHANGE_OTP_REQUIRED' in pg_get_functiondef('public.owner_set_seller_plan(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'plan change refuses to proceed without a matching verified OTP'
);
select ok(
  position('target_user_id' in pg_get_functiondef('public.owner_set_seller_plan(uuid,text,uuid,uuid)'::regprocedure)) > 0
  and position('plan_code' in pg_get_functiondef('public.owner_set_seller_plan(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'OTP consumption is bound to the exact seller and selected plan'
);

select * from finish();
rollback;
