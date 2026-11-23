-- Read-only preflight and post-migration verification for standard Ekhaya account IDs.
-- Run in the intended database before and after the reviewed migration.
-- This script performs SELECTs only.

select
  count(*) as profile_count,
  count(*) filter (where account_id is null) as missing_account_ids,
  count(*) filter (where account_id is not null and account_id !~ '^ET[0-9]{5}$') as malformed_account_ids,
  count(distinct account_id) filter (where account_id is not null) as distinct_account_ids,
  max(substring(account_id from 3)::bigint) filter (where account_id ~ '^ET[0-9]{5}$') as highest_account_number
from public.profiles;

select account_id, count(*) as duplicate_count
from public.profiles
where account_id is not null
group by account_id
having count(*) > 1;

select
  to_regclass('public.ekhaya_account_id_seq') as account_id_sequence,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'account_id'
      and is_nullable = 'NO'
  ) as account_id_is_not_null,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'profiles_account_id_unique'
      and indexdef ilike '%unique%'
  ) as unique_index_exists;
