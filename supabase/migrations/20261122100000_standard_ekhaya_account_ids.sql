-- Standard public-facing Ekhaya account identifiers.
-- Internal auth.users UUIDs remain unchanged and must continue to be used for joins/auth.
-- Format: ET followed by five digits (for example ET00001).

create sequence if not exists public.ekhaya_account_id_seq
  as bigint
  minvalue 1
  maxvalue 99999
  start with 1
  increment by 1
  no cycle;

alter table public.profiles
  add column if not exists account_id text;

with numbered_profiles as (
  select id, row_number() over (order by created_at asc nulls first, id asc) as account_number
  from public.profiles
  where account_id is null
)
update public.profiles p
set account_id = 'ET' || lpad(numbered_profiles.account_number::text, 5, '0')
from numbered_profiles
where p.id = numbered_profiles.id;

select setval(
  'public.ekhaya_account_id_seq',
  greatest(coalesce((select max(substring(account_id from 3)::bigint) from public.profiles), 1), 1),
  true
);

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
