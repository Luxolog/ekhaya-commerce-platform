begin;

select plan(3);

-- Isolated identities and programmes; the entire test is rolled back.
insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  'b9300000-0000-4000-8000-000000000001','authenticated','authenticated',
  'batch10-suspended-partner@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
),
(
  'b9300000-0000-4000-8000-000000000002','authenticated','authenticated',
  'batch10-pending-partner@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

insert into public.partner_programs(
  id,partner_name,partner_slug,referral_code,partner_user_id,status
) values
(
  'b9300000-0000-4000-8000-000000000011',
  'Batch 10 Suspended Partner','batch10-suspended','B10SUSPENDED',
  'b9300000-0000-4000-8000-000000000001','suspended'
),
(
  'b9300000-0000-4000-8000-000000000012',
  'Batch 10 Pending Partner','batch10-pending','B10PENDING',
  'b9300000-0000-4000-8000-000000000002','pending'
);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  'b9300000-0000-4000-8000-000000000021','authenticated','authenticated',
  'batch10-suspended-referral@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"referral_method":"unique_link","referral_code":"B10SUSPENDED"}'::jsonb,now(),now()
),
(
  'b9300000-0000-4000-8000-000000000022','authenticated','authenticated',
  'batch10-pending-referral@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"referral_method":"unique_link","referral_code":"B10PENDING"}'::jsonb,now(),now()
);

select is(
  (select count(*)::integer from public.partner_referrals
   where referred_user_id in (
     'b9300000-0000-4000-8000-000000000021',
     'b9300000-0000-4000-8000-000000000022'
   )),
  0,
  'suspended and pending partner programmes cannot attribute new referrals'
);

insert into public.partner_referrals(partner_id,referred_user_id,referral_code)
values (
  'b9300000-0000-4000-8000-000000000011',
  'b9300000-0000-4000-8000-000000000001',
  'B10SUSPENDED'
);

select is(
  (select count(*)::integer from public.partner_referrals
   where referred_user_id='b9300000-0000-4000-8000-000000000001'),
  0,
  'a partner cannot create a referral record for their own account'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname='prevent_partner_self_referral'
      and tgrelid='public.partner_referrals'::regclass
      and not tgisinternal
  ),
  'self-referral prevention is enforced by a database trigger'
);

select * from finish();
rollback;
