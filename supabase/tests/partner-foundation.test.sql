begin;

select plan(19);

select ok(to_regclass('public.partner_programs') is not null,
  'partner programme foundation exists');
select ok(to_regclass('public.partner_invitations') is not null,
  'partner invitation foundation exists');
select ok(to_regclass('public.partner_owner_access') is not null,
  'partner owner access foundation exists');
select ok(to_regclass('public.partner_referrals') is not null,
  'partner referral attribution foundation exists');
select ok(to_regclass('public.partner_commission_ledger') is not null,
  'partner commission ledger exists');
select ok(to_regclass('public.partner_monthly_statements') is not null,
  'partner monthly statements exist');
select ok(to_regclass('public.partner_commission_rate_schedule') is not null,
  'partner commission rate schedule exists');
select ok(to_regclass('public.payment_transactions') is not null,
  'authoritative payment transaction table exists');
select ok(to_regclass('public.user_notifications') is not null,
  'idempotent user notification table exists');

select ok(
  (select relrowsecurity from pg_class where oid='public.partner_programs'::regclass),
  'partner programmes have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid='public.partner_commission_ledger'::regclass),
  'commission ledger has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid='public.payment_transactions'::regclass),
  'payment transactions have RLS enabled'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.partner_commission_ledger'::regclass
      and contype='f'
      and pg_get_constraintdef(oid) ilike '%payment_transactions(id)%'
      and pg_get_constraintdef(oid) ilike '%payment_transaction_id%'
  ),
  'commission ledger retains its payment transaction foreign key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.partner_commission_ledger'::regclass
      and contype='u'
      and pg_get_constraintdef(oid) ilike '%payment_transaction_id%'
  ),
  'each payment transaction can produce at most one commission ledger row'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.user_notifications'::regclass
      and contype='u'
      and pg_get_constraintdef(oid) ilike '%(user_id, event_key)%'
  ),
  'notification event keys are idempotent per user'
);
select ok(
  not has_table_privilege('anon','public.partner_programs','INSERT')
  and not has_table_privilege('authenticated','public.partner_programs','INSERT'),
  'partner programme writes are not granted to client roles'
);
select ok(
  has_table_privilege('service_role','public.partner_programs','INSERT'),
  'service role can create partner programmes'
);
select ok(
  not exists (
    select 1 from pg_trigger
    where tgrelid='public.partner_programs'::regclass
      and tgname='ensure_partner_program_active_before_insert'
      and not tgisinternal
  ),
  'partner programme creation is not silently auto-activated'
);

insert into public.partner_programs(partner_name,partner_slug,referral_code)
values ('Batch 9 Migration Test','batch9-migration-test','BATCH9MIGRATIONTEST')
on conflict (partner_slug) do update set status='pending';

select ok(
  (select status='pending' from public.partner_programs where partner_slug='batch9-migration-test'),
  'new partner programmes retain pending status until explicit activation'
);

select * from finish();
rollback;
