begin;

select plan(23);

select ok(
  to_regclass('public.seller_pilot_search_events') is not null,
  'seller pilot request event table exists'
);
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='seller_pilot_search_events'
      and column_name='status'
  ),
  'seller pilot event status is persisted'
);
select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid='public.seller_pilot_search_events'::regclass
      and c.contype='u'
      and pg_get_constraintdef(c.oid) ilike '%(user_id, request_id)%'
  ),
  'seller pilot request IDs have a per-user unique constraint'
);
select ok(
  (select relrowsecurity from pg_class where oid='public.seller_pilot_search_events'::regclass),
  'seller pilot event table has row level security enabled'
);
select ok(
  to_regprocedure('public.reserve_seller_pilot_search(uuid,text,uuid)') is not null,
  'request-scoped pilot reservation function exists'
);
select ok(
  to_regprocedure('public.refund_seller_pilot_search(uuid,uuid)') is not null,
  'pilot refund function exists'
);
select ok(
  to_regprocedure('public.complete_seller_pilot_search(uuid,uuid)') is not null,
  'pilot completion function exists'
);
select ok(
  (select prosecdef from pg_proc where oid='public.reserve_seller_pilot_search(uuid,text,uuid)'::regprocedure),
  'pilot reservation function is SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where oid='public.refund_seller_pilot_search(uuid,uuid)'::regprocedure),
  'pilot refund function is SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where oid='public.complete_seller_pilot_search(uuid,uuid)'::regprocedure),
  'pilot completion function is SECURITY DEFINER'
);
select ok(
  not has_function_privilege('anon','public.reserve_seller_pilot_search(uuid,text,uuid)','EXECUTE'),
  'anonymous users cannot execute pilot reservation'
);
select ok(
  not has_function_privilege('authenticated','public.reserve_seller_pilot_search(uuid,text,uuid)','EXECUTE'),
  'authenticated users cannot execute pilot reservation directly'
);
select ok(
  has_function_privilege('service_role','public.reserve_seller_pilot_search(uuid,text,uuid)','EXECUTE'),
  'service role can execute pilot reservation'
);
select ok(
  to_regclass('private.partner_support_search_usage') is not null,
  'partner support usage ledger exists'
);
select ok(
  to_regprocedure('public.reserve_partner_support_search(uuid,text,uuid,text)') is not null,
  'partner support reservation function exists'
);
select ok(
  to_regprocedure('public.refund_partner_support_search(uuid,uuid)') is not null,
  'partner support refund function exists'
);
select ok(
  to_regprocedure('public.complete_partner_support_search(uuid,uuid)') is not null,
  'partner support completion function exists'
);
select ok(
  not has_function_privilege('anon','public.reserve_partner_support_search(uuid,text,uuid,text)','EXECUTE'),
  'anonymous users cannot execute partner support reservation'
);
select ok(
  has_function_privilege('service_role','public.reserve_partner_support_search(uuid,text,uuid,text)','EXECUTE'),
  'service role can execute partner support reservation'
);
select ok(
  to_regprocedure('public.accept_saechamber_partner_invitation(uuid,uuid,text,text)') is not null,
  'atomic partner invitation acceptance function exists'
);
select ok(
  (select prosecdef from pg_proc where oid='public.accept_saechamber_partner_invitation(uuid,uuid,text,text)'::regprocedure),
  'atomic partner acceptance function is SECURITY DEFINER'
);
select ok(
  not has_function_privilege('anon','public.accept_saechamber_partner_invitation(uuid,uuid,text,text)','EXECUTE'),
  'anonymous users cannot execute partner invitation acceptance'
);
select ok(
  has_function_privilege('service_role','public.accept_saechamber_partner_invitation(uuid,uuid,text,text)','EXECUTE'),
  'service role can execute partner invitation acceptance'
);

select * from finish();
rollback;
