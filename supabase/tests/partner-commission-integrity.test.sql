begin;

select plan(2);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  'b9600000-0000-4000-8000-000000000001','authenticated','authenticated',
  'batch10-commission-partner@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
),
(
  'b9600000-0000-4000-8000-000000000002','authenticated','authenticated',
  'batch10-commission-seller@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

insert into public.partner_programs(
  id,partner_name,partner_slug,referral_code,partner_user_id,status
) values (
  'b9600000-0000-4000-8000-000000000011',
  'Batch 10 Commission Partner','batch10-commission','B10COMMISSION',
  'b9600000-0000-4000-8000-000000000001','active'
);

insert into public.partner_referrals(partner_id,referred_user_id,referral_code)
values (
  'b9600000-0000-4000-8000-000000000011',
  'b9600000-0000-4000-8000-000000000002',
  'B10COMMISSION'
);

insert into public.payment_transactions(
  id,user_id,payment_provider,merchant_reference,payment_kind,billing_mode,
  amount,currency,status,paid_at
) values
(
  'b9600000-0000-4000-8000-000000000021',
  'b9600000-0000-4000-8000-000000000001',
  'test','batch10-self-commission-payment',
  'one_off','manual',100,'ZAR','complete',now()
),
(
  'b9600000-0000-4000-8000-000000000022',
  'b9600000-0000-4000-8000-000000000002',
  'test','batch10-valid-commission-payment',
  'one_off','manual',100,'ZAR','complete',now()
);

insert into public.partner_commission_ledger(
  partner_id,referral_id,referred_user_id,payment_transaction_id,payment_month,
  plan_code,qualifying_amount,active_referred_sellers,commission_band,
  commission_rate,commission_amount
) values (
  'b9600000-0000-4000-8000-000000000011',
  (select id from public.partner_referrals
   where referred_user_id='b9600000-0000-4000-8000-000000000002'),
  'b9600000-0000-4000-8000-000000000001',
  'b9600000-0000-4000-8000-000000000021',
  date_trunc('month',now())::date,
  'growth',100,1,1,0.10,10
);

select is(
  (select count(*)::integer from public.partner_commission_ledger
   where payment_transaction_id='b9600000-0000-4000-8000-000000000021'),
  0,
  'partner cannot earn commission on their own account payment'
);

insert into public.partner_commission_ledger(
  partner_id,referral_id,referred_user_id,payment_transaction_id,payment_month,
  plan_code,qualifying_amount,active_referred_sellers,commission_band,
  commission_rate,commission_amount
) values (
  'b9600000-0000-4000-8000-000000000011',
  (select id from public.partner_referrals
   where referred_user_id='b9600000-0000-4000-8000-000000000002'),
  'b9600000-0000-4000-8000-000000000002',
  'b9600000-0000-4000-8000-000000000022',
  date_trunc('month',now())::date,
  'growth',100,1,1,0.10,10
);

select is(
  (select count(*)::integer from public.partner_commission_ledger
   where payment_transaction_id='b9600000-0000-4000-8000-000000000022'),
  1,
  'commission for a qualifying referred seller remains traceable to its payment'
);

select * from finish();
rollback;
