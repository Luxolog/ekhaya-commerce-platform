begin;

select plan(15);

-- All fixtures are isolated to this pgTAP transaction. No external provider,
-- SMTP, or production service is contacted.
-- Exercise the normal profile bootstrap defaults; no marketplace is preselected.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b9000000-0000-4000-8000-000000000001','authenticated','authenticated',
  'batch9-partner@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

-- The active partner must exist before the referred auth user is inserted:
-- referral attribution is captured by the auth.users AFTER INSERT trigger.
insert into public.partner_programs (
  id, partner_name, partner_slug, referral_code, partner_user_id, status
) values (
  'b9000000-0000-4000-8000-000000000011',
  'Batch 9 Behaviour Partner','batch9-behaviour','BATCH9BEHAVIOUR',
  'b9000000-0000-4000-8000-000000000001','active'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'b9000000-0000-4000-8000-000000000002','authenticated','authenticated',
  'batch9-referral@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"referral_method":"unique_link","referral_code":"BATCH9BEHAVIOUR","display_name":"Batch 9 Referral"}'::jsonb,
  now(),now()
),
(
  'b9000000-0000-4000-8000-000000000003','authenticated','authenticated',
  'batch9-payment@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);


select is(
  (select count(*)::integer from public.partner_referrals
   where referred_user_id='b9000000-0000-4000-8000-000000000002'),
  1,
  'unique-link signup creates one referral attribution'
);

select is(
  (select count(*)::integer from public.user_notifications
   where user_id='b9000000-0000-4000-8000-000000000001'
     and event_key like 'partner-referral:new:%'),
  1,
  'new referral queues one partner notification'
);

-- Replaying the same attribution cannot create a second referral.
insert into public.partner_referrals(partner_id,referred_user_id,referral_code)
values (
  'b9000000-0000-4000-8000-000000000011',
  'b9000000-0000-4000-8000-000000000002',
  'BATCH9BEHAVIOUR'
) on conflict (referred_user_id) do nothing;

select is(
  (select count(*)::integer from public.partner_referrals
   where referred_user_id='b9000000-0000-4000-8000-000000000002'),
  1,
  'referral attribution replay remains idempotent'
);

-- A payment transition marks first-paid once and queues one status notification.
insert into public.payment_transactions(
  id,user_id,payment_provider,merchant_reference,payment_kind,billing_mode,
  amount,currency,status,paid_at
) values (
  'b9000000-0000-4000-8000-000000000021',
  'b9000000-0000-4000-8000-000000000002',
  'test','batch9-payment-001','one_off','manual',10,'ZAR','pending',null
);

update public.payment_transactions
set status='complete', paid_at='2026-11-22T12:00:00Z'
where id='b9000000-0000-4000-8000-000000000021';

select is(
  (select first_paid_at from public.partner_referrals
   where referred_user_id='b9000000-0000-4000-8000-000000000002'),
  '2026-11-22T12:00:00Z'::timestamptz,
  'first completed payment stamps the referral first-paid time'
);

select is(
  (select count(*)::integer from public.user_notifications
   where user_id='b9000000-0000-4000-8000-000000000002'
     and event_key='payment:complete:b9000000-0000-4000-8000-000000000021'),
  1,
  'completed payment queues one idempotent customer notification'
);

-- Repeated updates do not overwrite the original first-paid timestamp or duplicate notices.
update public.payment_transactions
set paid_at='2026-11-23T12:00:00Z'
where id='b9000000-0000-4000-8000-000000000021';

select is(
  (select first_paid_at from public.partner_referrals
   where referred_user_id='b9000000-0000-4000-8000-000000000002'),
  '2026-11-22T12:00:00Z'::timestamptz,
  'subsequent payment updates preserve the original first-paid timestamp'
);

select is(
  (select count(*)::integer from public.user_notifications
   where user_id='b9000000-0000-4000-8000-000000000002'
     and event_key='payment:complete:b9000000-0000-4000-8000-000000000021'),
  1,
  'repeated completed-payment update does not duplicate notification'
);

-- Paid-credit grant is idempotent by source reference and rejects mismatched replay.
select is(
  public.grant_paid_search_credits(
    'b9000000-0000-4000-8000-000000000003','growth',100,
    'batch9-behaviour-credit-001',null
  )->>'allocated',
  'true',
  'first paid-credit grant allocates credits'
);

select is(
  public.grant_paid_search_credits(
    'b9000000-0000-4000-8000-000000000003','growth',100,
    'batch9-behaviour-credit-001',null
  )->>'duplicate',
  'true',
  'replayed paid-credit grant returns duplicate without allocating again'
);

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference='batch9-behaviour-credit-001'),
  1,
  'paid-credit replay leaves exactly one allocation row'
);

select throws_ok(
  $$select public.grant_paid_search_credits(
    'b9000000-0000-4000-8000-000000000003','growth',150,
    'batch9-behaviour-credit-001',null
  )$$,
  'P0001',
  'Allocation reference already exists with different details',
  'same paid-credit reference cannot be reused with different allocation details'
);

select is(
  (select credits_allocated from public.search_credit_allocations
   where source_reference='batch9-behaviour-credit-001'),
  100,
  'mismatched replay leaves original allocation amount unchanged'
);

-- Exercise the payment-completion trigger with a synthetic subscription.
insert into public.subscriptions(
  id,user_id,plan_code,status,billing_mode
) values (
  'b9000000-0000-4000-8000-000000000031',
  'b9000000-0000-4000-8000-000000000003',
  'growth','active','manual'
);

insert into public.payment_transactions(
  id,user_id,subscription_id,payment_provider,merchant_reference,
  payment_kind,billing_mode,amount,currency,status,paid_at
) values (
  'b9000000-0000-4000-8000-000000000032',
  'b9000000-0000-4000-8000-000000000003',
  'b9000000-0000-4000-8000-000000000031',
  'test','batch10-payment-trigger-001',
  'introductory','manual',49,'ZAR','pending',null
);

update public.payment_transactions
set status='failed'
where id='b9000000-0000-4000-8000-000000000032';

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference='payment:b9000000-0000-4000-8000-000000000032'),
  0,
  'failed subscription payment does not allocate paid search credits'
);

update public.payment_transactions
set status='complete',paid_at='2026-11-22T13:00:00Z'
where id='b9000000-0000-4000-8000-000000000032';

select is(
  (select credits_allocated from public.search_credit_allocations
   where source_reference='payment:b9000000-0000-4000-8000-000000000032'),
  100,
  'confirmed complete subscription payment allocates the configured plan credits'
);

update public.payment_transactions
set paid_at='2026-11-23T13:00:00Z'
where id='b9000000-0000-4000-8000-000000000032';

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference='payment:b9000000-0000-4000-8000-000000000032'),
  1,
  'replayed completion update does not create a duplicate paid-credit allocation'
);

select * from finish();
rollback;
