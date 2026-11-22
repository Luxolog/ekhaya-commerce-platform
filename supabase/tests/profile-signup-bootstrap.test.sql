begin;

select plan(2);

-- Exercise the real auth.users profile bootstrap with no marketplace metadata.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b9200000-0000-4000-8000-000000000001',
  'authenticated','authenticated',
  'batch10-profile-bootstrap@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Batch 10 Profile Bootstrap"}'::jsonb,
  now(),now()
);

select ok(
  exists (
    select 1 from public.profiles
    where id='b9200000-0000-4000-8000-000000000001'
  ),
  'a new auth user receives a profile through the normal bootstrap trigger'
);

select is(
  (select marketplace_access from public.profiles
   where id='b9200000-0000-4000-8000-000000000001'),
  '{}'::text[],
  'a new seller profile may remain unselected until marketplace onboarding'
);

select * from finish();
rollback;
