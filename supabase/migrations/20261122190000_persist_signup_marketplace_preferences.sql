-- Persist seller marketplace choices supplied during signup.
-- Marketplace selection is a seller preference captured at account creation;
-- it does not replace plan entitlement or marketplace search validation.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_marketplace_access text[] := '{}'::text[];
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'marketplace_access') = 'array' then
    select coalesce(array_agg(distinct value), '{}'::text[])
      into v_marketplace_access
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'marketplace_access') as item(value)
    where value = any(array['takealot','amazon','makro']::text[]);
  end if;

  insert into public.profiles(id, display_name, marketplace_access)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'display_name', '')), ''),
    v_marketplace_access
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
