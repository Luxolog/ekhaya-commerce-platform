-- Harden the SECURITY DEFINER quota RPCs against object shadowing.
-- All application objects in the functions are schema-qualified; pg_catalog remains implicitly available.
alter function public.consume_marketing_usage(uuid,text,integer,text,jsonb)
  set search_path = '';
alter function public.release_marketing_usage(uuid,text)
  set search_path = '';
