-- Maintain request-level partner support reservation state.
-- Cache hits no longer reserve support allowance; failed live attempts can refund
-- exactly once while the unique request row remains as an idempotency tombstone.

alter table private.partner_support_search_usage
  add column if not exists status text not null default 'completed'
    check (status in ('reserved','completed','refunded'));
alter table private.partner_support_search_usage
  add column if not exists refunded_at timestamptz;
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
  v_updated_id bigint;
begin
  if p_user_id is null or p_request_id is null then
    return false;
  end if;

  update private.partner_support_search_usage
  set status='refunded', refunded_at=now()
  where partner_user_id = p_user_id
    and request_id = p_request_id
    and status='reserved'
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$function$;

revoke all on function public.refund_partner_support_search(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.refund_partner_support_search(uuid, uuid)
  to service_role;

comment on function public.refund_partner_support_search(uuid, uuid) is
  'Refunds a failed live partner support search once while retaining its request idempotency record. Cache hits are not reserved.';
