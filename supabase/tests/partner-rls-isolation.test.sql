begin;

select plan(6);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  'b9400000-0000-4000-8000-000000000001','authenticated','authenticated',
  'batch10-rls-owner@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
),
(
  'b9400000-0000-4000-8000-000000000002','authenticated','authenticated',
  'batch10-rls-partner-a@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
),
(
  'b9400000-0000-4000-8000-000000000003','authenticated','authenticated',
  'batch10-rls-partner-b@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
),
(
  'b9400000-0000-4000-8000-000000000011','authenticated','authenticated',
  'batch10-rls-seller-a@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
),
(
  'b9400000-0000-4000-8000-000000000012','authenticated','authenticated',
  'batch10-rls-seller-b@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

insert into public.partner_owner_access(user_id,email)
values ('b9400000-0000-4000-8000-000000000001','batch10-rls-owner@example.invalid');

insert into public.partner_programs(
  id,partner_name,partner_slug,referral_code,partner_user_id,status
) values
(
  'b9400000-0000-4000-8000-000000000021',
  'Batch 10 RLS Partner A','batch10-rls-a','B10RLSA',
  'b9400000-0000-4000-8000-000000000002','active'
),
(
  'b9400000-0000-4000-8000-000000000022',
  'Batch 10 RLS Partner B','batch10-rls-b','B10RLSB',
  'b9400000-0000-4000-8000-000000000003','active'
);

insert into public.partner_referrals(partner_id,referred_user_id,referral_code)
values
(
  'b9400000-0000-4000-8000-000000000021',
  'b9400000-0000-4000-8000-000000000011','B10RLSA'
),
(
  'b9400000-0000-4000-8000-000000000022',
  'b9400000-0000-4000-8000-000000000012','B10RLSB'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','b9400000-0000-4000-8000-000000000002',true);

select is(
  (select count(*)::integer from public.partner_programs),
  1,
  'partner A can read only their own programme'
);

select is(
  (select count(*)::integer from public.partner_referrals),
  1,
  'partner A can read only their own referrals'
);

select is(
  (select count(*)::integer from public.partner_programs
   where id='b9400000-0000-4000-8000-000000000022'),
  0,
  'partner A cannot read partner B programme by direct query'
);

select set_config('request.jwt.claim.sub','b9400000-0000-4000-8000-000000000003',true);

select is(
  (select count(*)::integer from public.partner_referrals),
  1,
  'partner B can read only their own referrals'
);

select set_config('request.jwt.claim.sub','b9400000-0000-4000-8000-000000000001',true);

select is(
  (select count(*)::integer from public.partner_programs),
  3,
  'authorised Ekhaya owner can read all partner programmes, including the seeded SA eChamber programme'
);

select is(
  (select count(*)::integer from public.partner_referrals),
  2,
  'authorised Ekhaya owner can read all partner referrals'
);

reset role;

select * from finish();
rollback;
