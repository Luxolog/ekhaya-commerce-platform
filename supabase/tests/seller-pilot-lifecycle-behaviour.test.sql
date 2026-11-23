begin;

select plan(11);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  'b9500000-0000-4000-8000-000000000001',
  'authenticated','authenticated',
  'batch10-pilot-lifecycle@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

insert into public.seller_pilot_access(
  user_id,started_at,ends_at,status,daily_limit,total_limit,pilot_label
) values (
  'b9500000-0000-4000-8000-000000000001',
  now() - interval '1 hour',
  now() + interval '1 day',
  'active',10,50,'Batch 10 lifecycle test'
);

select is(
  public.reserve_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'takealot',
    'b9500000-0000-4000-8000-000000000011'
  )->>'allowed',
  'true',
  'active pilot seller can reserve a Takealot search'
);

select is(
  public.reserve_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'takealot',
    'b9500000-0000-4000-8000-000000000011'
  )->>'duplicate',
  'true',
  'replayed request ID does not consume a second pilot search'
);

select is(
  public.complete_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'b9500000-0000-4000-8000-000000000011'
  ),
  true,
  'reserved pilot search can be completed once'
);

select is(
  public.complete_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'b9500000-0000-4000-8000-000000000011'
  ),
  false,
  'completed pilot search cannot be completed twice'
);

select is(
  public.refund_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'b9500000-0000-4000-8000-000000000011'
  ),
  false,
  'completed pilot search cannot be refunded'
);

select is(
  public.reserve_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'takealot',
    'b9500000-0000-4000-8000-000000000012'
  )->>'allowed',
  'true',
  'a second unique request can reserve another search'
);

select is(
  public.refund_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'b9500000-0000-4000-8000-000000000012'
  ),
  true,
  'failed request refund releases its exact reservation'
);

select is(
  public.refund_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'b9500000-0000-4000-8000-000000000012'
  ),
  false,
  'replayed refund cannot release usage twice'
);

select is(
  (select count(*)::integer
   from generate_series(1,9) as g(n)
   cross join lateral (
     select public.reserve_seller_pilot_search(
       'b9500000-0000-4000-8000-000000000001',
       'takealot',
       md5('batch10-pilot-capacity-'||g.n::text)::uuid
     ) as result
   ) r
   where r.result->>'allowed'='true'),
  9,
  'nine additional unique requests fill the remaining daily allowance'
);

select is(
  public.reserve_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'takealot',
    'b9500000-0000-4000-8000-000000000013'
  )->>'reason',
  'PILOT_DAILY_LIMIT',
  'the next request is rejected at the daily search limit'
);

select is(
  public.reserve_seller_pilot_search(
    'b9500000-0000-4000-8000-000000000001',
    'amazon',
    'b9500000-0000-4000-8000-000000000014'
  )->>'reason',
  'PILOT_MARKETPLACE_UNSUPPORTED',
  'pilot reservation rejects unsupported marketplaces'
);

select * from finish();
rollback;
