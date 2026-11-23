begin;

-- Standard public-facing Ekhaya account identifiers.
-- Internal auth.users UUIDs remain unchanged and must continue to be used for joins/auth.
-- Format: ET followed by five digits (for example ET00001).
--
-- The table lock prevents concurrent profile inserts while existing rows are
-- numbered and the sequence/default/NOT NULL constraint are installed.
-- Existing non-null IDs are preserved; malformed IDs fail closed for owner review.

create sequence if not exists public.ekhaya_account_id_seq
  as bigint
  minvalue 1
  maxvalue 99999
  start with 1
  increment by 1
  no cycle;

lock table public.profiles in access exclusive mode;

alter table public.profiles
  add column if not exists account_id text;

do $$
declare
  invalid_count bigint;
  duplicate_count bigint;
  current_max bigint;
  missing_count bigint;
begin
  select count(*) into invalid_count
  from public.profiles
  where account_id is not null
    and account_id !~ '^ET[0-9]{5}$';

  if invalid_count > 0 then
    raise exception 'Account ID migration stopped: % existing account_id value(s) do not match ET plus five digits.', invalid_count;
  end if;

  select count(*) - count(distinct account_id) into duplicate_count
  from public.profiles
  where account_id is not null;

  if duplicate_count > 0 then
    raise exception 'Account ID migration stopped: duplicate existing account_id values were found.';
  end if;

  select coalesce(max(substring(account_id from 3)::bigint), 0)
  into current_max
  from public.profiles
  where account_id is not null;

  select count(*) into missing_count
  from public.profiles
  where account_id is null;

  if current_max + missing_count > 99999 then
    raise exception 'Account ID migration stopped: the five-digit ET account ID range would be exceeded.';
  end if;

  with numbered_profiles as (
    select id,
      row_number() over (order by created_at asc nulls first, id asc) as row_number
    from public.profiles
    where account_id is null
  )
  update public.profiles p
  set account_id = 'ET' || lpad((current_max + numbered_profiles.row_number)::text, 5, '0')
  from numbered_profiles
  where p.id = numbered_profiles.id;
end;
$$;

select setval(
  'public.ekhaya_account_id_seq',
  coalesce((select max(substring(account_id from 3)::bigint) from public.profiles), 1),
  exists(select 1 from public.profiles)
);

alter sequence public.ekhaya_account_id_seq
  owned by public.profiles.account_id;

alter table public.profiles
  alter column account_id set default (
    'ET' || lpad(nextval('public.ekhaya_account_id_seq')::text, 5, '0')
  );

alter table public.profiles
  alter column account_id set not null;

create unique index if not exists profiles_account_id_unique
  on public.profiles(account_id);

alter table public.profiles
  drop constraint if exists profiles_account_id_format_check;

alter table public.profiles
  add constraint profiles_account_id_format_check
  check (account_id ~ '^ET[0-9]{5}$');

comment on column public.profiles.account_id is
  'Public-facing Ekhaya account reference (ET plus five digits); never use as an auth UUID.';

commit;
