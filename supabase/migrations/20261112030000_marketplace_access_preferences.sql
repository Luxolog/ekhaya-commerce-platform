-- Seller-selected marketplace access.
-- Existing accounts retain access to both marketplaces; new signups choose one or both.
alter table public.profiles
  add column if not exists marketplace_access text[] not null
  default array['takealot','amazon']::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_marketplace_access_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_marketplace_access_valid
      check (
        cardinality(marketplace_access) between 1 and 2
        and marketplace_access <@ array['takealot','amazon']::text[]
      );
  end if;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_access text[];
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'marketplace_access') = 'array' then
    select coalesce(array_agg(distinct item.value), array[]::text[])
      into requested_access
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'marketplace_access') as item(value)
    where item.value in ('takealot', 'amazon');
  else
    requested_access := array['takealot','amazon']::text[];
  end if;

  if cardinality(requested_access) = 0 then
    requested_access := array['takealot','amazon']::text[];
  end if;

  insert into public.profiles(id, display_name, marketplace_access)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
    requested_access
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
