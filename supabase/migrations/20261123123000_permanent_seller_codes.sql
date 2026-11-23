-- Permanent human-readable seller identifiers for Ekhaya Technologies.
-- Internal auth UUIDs remain unchanged and are never used as the displayed Seller ID.

create sequence if not exists public.seller_code_seq
  as bigint
  minvalue 1
  maxvalue 99999
  start with 1
  increment by 1
  no cycle;

alter table public.profiles
  add column if not exists seller_code text;

-- Assign stable IDs to existing profiles in a deterministic order.
do $$
declare
  profile_row record;
begin
  for profile_row in
    select p.id
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.seller_code is null
      and coalesce(u.raw_app_meta_data ->> 'role', 'seller') <> 'owner'
      and coalesce(u.raw_app_meta_data ->> 'is_owner', 'false') <> 'true'
    order by p.created_at nulls first, p.id
  loop
    update public.profiles
    set seller_code = 'ET' || lpad(nextval('public.seller_code_seq')::text, 5, '0')
    where id = profile_row.id;
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_seller_code_format_check
  check (seller_code is null or seller_code ~ '^ET[0-9]{5}$');

create unique index if not exists profiles_seller_code_unique
  on public.profiles(seller_code)
  where seller_code is not null;

-- Every new non-owner profile receives the next permanent seller code.
create or replace function private.assign_seller_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app_metadata jsonb;
begin
  if new.seller_code is not null then
    return new;
  end if;

  select coalesce(raw_app_meta_data, '{}'::jsonb)
    into v_app_metadata
  from auth.users
  where id = new.id;

  if coalesce(v_app_metadata ->> 'role', 'seller') = 'owner'
     or coalesce(v_app_metadata ->> 'is_owner', 'false') = 'true' then
    return new;
  end if;

  new.seller_code := 'ET' || lpad(nextval('public.seller_code_seq')::text, 5, '0');
  return new;
end;
$$;

revoke all on function private.assign_seller_code() from public, anon, authenticated;

drop trigger if exists profiles_assign_seller_code on public.profiles;
create trigger profiles_assign_seller_code
  before insert on public.profiles
  for each row execute function private.assign_seller_code();

grant usage, select on sequence public.seller_code_seq to service_role;
