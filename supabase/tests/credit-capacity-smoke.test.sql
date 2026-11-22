begin;

select plan(5);

-- A single isolated 10,000-seller fixture exercises the allocation index at
-- the requested cumulative dataset sizes. All identities and rows roll back.
insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
select
  md5('batch10-capacity-'||g::text)::uuid,
  'authenticated','authenticated',
  'batch10-capacity-'||lpad(g::text,5,'0')||'@example.invalid',
  '',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,now(),now()
from generate_series(1,10000) as g;

do $benchmark$
declare
  v_started timestamptz := clock_timestamp();
begin
  insert into public.search_credit_allocations(
    user_id,plan_code,source_reference,credits_allocated,credits_available
  )
  select
    md5('batch10-capacity-'||g::text)::uuid,
    'growth',
    'batch10-capacity-'||lpad(g::text,5,'0'),
    100,
    100
  from generate_series(1,10000) as g;

  raise notice 'Batch 10 synthetic allocation insert: 10000 sellers, elapsed_ms=%',
    round(extract(epoch from clock_timestamp()-v_started)*1000,2);
end;
$benchmark$;

do $benchmark$
declare
  v_size integer;
  v_started timestamptz;
  v_rows bigint;
begin
  foreach v_size in array array[100,500,1000,5000,10000] loop
    v_started := clock_timestamp();
    select count(*) into v_rows
    from public.search_credit_allocations
    where source_reference between
      'batch10-capacity-00001'
      and 'batch10-capacity-'||lpad(v_size::text,5,'0');
    raise notice 'Batch 10 synthetic allocation lookup: sellers=%, rows=%, elapsed_ms=%',
      v_size,v_rows,round(extract(epoch from clock_timestamp()-v_started)*1000,2);
  end loop;
end;
$benchmark$;

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference between 'batch10-capacity-00001' and 'batch10-capacity-00100'),
  100,
  '100 synthetic sellers each have one allocation'
);

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference between 'batch10-capacity-00001' and 'batch10-capacity-00500'),
  500,
  '500 synthetic sellers each have one allocation'
);

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference between 'batch10-capacity-00001' and 'batch10-capacity-01000'),
  1000,
  '1000 synthetic sellers each have one allocation'
);

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference between 'batch10-capacity-00001' and 'batch10-capacity-05000'),
  5000,
  '5000 synthetic sellers each have one allocation'
);

select is(
  (select count(*)::integer from public.search_credit_allocations
   where source_reference between 'batch10-capacity-00001' and 'batch10-capacity-10000'),
  10000,
  '10000 synthetic sellers each have one allocation'
);

select * from finish();
rollback;
