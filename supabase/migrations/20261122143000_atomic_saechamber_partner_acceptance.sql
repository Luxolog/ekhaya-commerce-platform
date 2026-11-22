-- Atomically link the verified invitee and accept the invitation.
-- This prevents a failure between the partner_programs and partner_invitations
-- writes from leaving a linked programme with a pending invitation.
create or replace function public.accept_saechamber_partner_invitation(
  p_invitation_id uuid,
  p_user_id uuid,
  p_user_email text,
  p_referral_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_invitation public.partner_invitations%rowtype;
  v_partner public.partner_programs%rowtype;
  v_email text := lower(btrim(coalesce(p_user_email, '')));
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
begin
  if p_invitation_id is null or p_user_id is null
     or v_email = ''
     or v_code !~ '^[A-Z0-9]{5,20}$' then
    raise exception 'INVALID_INVITATION_REQUEST' using errcode = '22023';
  end if;

  select * into v_invitation
  from public.partner_invitations
  where id = p_invitation_id
  for update;

  if not found
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at is null
     or v_invitation.expires_at <= now()
     or lower(v_invitation.invited_email) <> v_email then
    raise exception 'INVITATION_INVALID_EXPIRED_OR_ALREADY_USED' using errcode = 'P0001';
  end if;

  select * into v_partner
  from public.partner_programs
  where id = v_invitation.partner_id
  for update;

  if not found then
    raise exception 'PARTNER_PROGRAM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_partner.partner_user_id is not null
     and v_partner.partner_user_id <> p_user_id then
    raise exception 'PARTNER_PROGRAM_ALREADY_LINKED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.partner_programs p
    where upper(p.referral_code) = v_code
      and p.id <> v_partner.id
  ) then
    raise exception 'REFERRAL_CODE_ALREADY_IN_USE' using errcode = '23505';
  end if;

  update public.partner_programs
  set partner_user_id = p_user_id,
      referral_code = v_code,
      updated_at = now()
  where id = v_partner.id
  returning * into v_partner;

  update public.partner_invitations
  set status = 'accepted',
      accepted_at = now()
  where id = v_invitation.id
    and status = 'pending';

  if not found then
    raise exception 'INVITATION_ACCEPTANCE_RACE' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'id', v_partner.id,
    'partner_name', v_partner.partner_name,
    'partner_slug', v_partner.partner_slug,
    'referral_code', v_partner.referral_code,
    'status', v_partner.status,
    'partner_user_id', v_partner.partner_user_id
  );
end;
$function$;

revoke all on function public.accept_saechamber_partner_invitation(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.accept_saechamber_partner_invitation(uuid, uuid, text, text)
  to service_role;

comment on function public.accept_saechamber_partner_invitation(uuid, uuid, text, text) is
  'Atomically links a verified invited partner account and marks its pending invitation accepted; trigger notifications remain in the same transaction.';
