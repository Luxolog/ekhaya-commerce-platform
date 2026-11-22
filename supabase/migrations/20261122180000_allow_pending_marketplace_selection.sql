-- Allow account creation before a seller chooses marketplace access.
-- The signup flow creates the profile first; marketplace selection is a later
-- onboarding step. Empty means "not selected yet", not unrestricted access.
alter table public.profiles
  drop constraint if exists profiles_marketplace_access_valid;

alter table public.profiles
  add constraint profiles_marketplace_access_valid
  check (
    cardinality(marketplace_access) between 0 and 3
    and marketplace_access <@ array['takealot', 'amazon', 'makro']::text[]
  );
