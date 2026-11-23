-- Use distinct permanent identifiers for seller accounts and partner programmes.
-- Internal UUIDs remain the relational keys and are never exposed as public IDs.

-- Partner owners are not sellers. Remove any seller identifier previously assigned
-- to partner-role profiles before enforcing the seller-specific format.
update public.profiles p
set seller_code = null
from auth.users u
where u.id = p.id
  and (
    coalesce(u.raw_app_meta_data ->> 'role', '') = 'partner'
    or exists (
      select 1 from public.partner_programs pp
      where pp.partner_user_id = p.id
    )
  );

alter table public.profiles
  drop constraint if exists profiles_seller_code_format_check;

update public.profiles
set seller_code = 'ET-S' || substring(seller_code from 3)
where seller_code ~ '^ET[0-9]{5}$';

alter table public.profiles
  add constraint profiles_seller_code_format_check
  check (seller_code is null or seller_code ~ '^ET-S[0-9]{5}$');

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

  if coalesce(v_app_metadata ->> 'role', 'seller') in ('owner', 'partner')
     or coalesce(v_app_metadata ->> 'is_owner', 'false') = 'true'
     or exists (
       select 1 from public.partner_programs
       where partner_user_id = new.id
     ) then
    return new;
  end if;

  new.seller_code := 'ET-S' || lpad(nextval('public.seller_code_seq')::text, 5, '0');
  return new;
end;
$$;

create sequence if not exists public.partner_code_seq
  as bigint minvalue 1 maxvalue 99999 start with 1 increment by 1 no cycle;

alter table public.partner_programs
  add column if not exists partner_code text;

do $$
declare
  partner_row record;
begin
  for partner_row in
    select id
    from public.partner_programs
    where partner_code is null
    order by created_at nulls first, id
  loop
    update public.partner_programs
    set partner_code = 'ET-P' || lpad(nextval('public.partner_code_seq')::text, 5, '0')
    where id = partner_row.id;
  end loop;
end;
$$;

alter table public.partner_programs
  add constraint partner_programs_partner_code_format_check
  check (partner_code is null or partner_code ~ '^ET-P[0-9]{5}$');

create unique index if not exists partner_programs_partner_code_unique
  on public.partner_programs(partner_code)
  where partner_code is not null;

create or replace function private.assign_partner_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.partner_code is null then
    new.partner_code := 'ET-P' || lpad(nextval('public.partner_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

revoke all on function private.assign_partner_code() from public, anon, authenticated;
drop trigger if exists partner_programs_assign_partner_code on public.partner_programs;
create trigger partner_programs_assign_partner_code
  before insert on public.partner_programs
  for each row execute function private.assign_partner_code();

grant usage, select on sequence public.partner_code_seq to service_role;
