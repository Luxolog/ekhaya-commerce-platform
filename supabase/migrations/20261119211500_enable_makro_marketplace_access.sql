alter table public.profiles drop constraint if exists profiles_marketplace_access_valid;

alter table public.profiles
  add constraint profiles_marketplace_access_valid
  check (
    cardinality(marketplace_access) >= 1
    and cardinality(marketplace_access) <= 3
    and marketplace_access <@ array['takealot', 'amazon', 'makro']::text[]
  );
