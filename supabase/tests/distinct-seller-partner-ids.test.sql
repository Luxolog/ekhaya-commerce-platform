begin;

select plan(8);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_seller_code_format_check'
      and pg_get_constraintdef(oid) like '%ET-S%'
  ),
  'seller identifiers enforce the ET-S five-digit format'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'profiles_seller_code_unique'
      and indexdef ilike '%unique%'
  ),
  'seller identifiers are unique'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.partner_programs'::regclass
      and conname = 'partner_programs_partner_code_format_check'
      and pg_get_constraintdef(oid) like '%ET-P%'
  ),
  'partner identifiers enforce the ET-P five-digit format'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'partner_programs'
      and indexname = 'partner_programs_partner_code_unique'
      and indexdef ilike '%unique%'
  ),
  'partner identifiers are unique'
);

select ok(
  to_regclass('public.partner_code_seq') is not null,
  'partner identifier sequence exists'
);

select ok(
  to_regprocedure('private.assign_seller_code()') is not null
  and position('ET-S' in pg_get_functiondef('private.assign_seller_code()'::regprocedure)) > 0,
  'new seller profiles receive ET-S identifiers'
);

select ok(
  to_regprocedure('private.assign_partner_code()') is not null
  and position('ET-P' in pg_get_functiondef('private.assign_partner_code()'::regprocedure)) > 0,
  'new partner programmes receive ET-P identifiers'
);

select ok(
  not exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where (
      coalesce(u.raw_app_meta_data ->> 'role', '') in ('owner','partner')
      or exists (
        select 1 from public.partner_programs pp
        where pp.partner_user_id = p.id
      )
    )
      and p.seller_code is not null
  ),
  'owner and partner-role profiles are not assigned seller identifiers'
);

select * from finish();
rollback;
