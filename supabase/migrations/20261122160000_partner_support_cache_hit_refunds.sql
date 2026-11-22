-- Release a partner support allowance when a search is served from shared cache.
-- Cache hits are free; deleting the reservation also makes a repeated cached request
-- free without weakening the unique request constraint for live provider searches.
create or replace function public.refund_partner_support_search(
  p_user_id uuid,
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted_id bigint;
begin
  if p_user_id is null or p_request_id is null then
    return false;
  end if;

  delete from private.partner_support_search_usage
  where partner_user_id = p_user_id
    and request_id = p_request_id
  returning id into v_deleted_id;

  return v_deleted_id is not null;
end;
$function$;

revoke all on function public.refund_partner_support_search(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.refund_partner_support_search(uuid, uuid)
  to service_role;

comment on function public.refund_partner_support_search(uuid, uuid) is
  'Releases a partner support search reservation when the request is served from shared cache; cache hits do not consume partner daily support allowance.';
