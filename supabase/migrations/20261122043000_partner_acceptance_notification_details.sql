-- Ensure partner acceptance notifications contain the full audit and welcome details.
-- Idempotency remains protected by the unique (user_id, event_key) constraint.
create or replace function private.notify_partner_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_partner_name text;
  v_referral_code text;
  v_partner_user_id uuid;
  v_accepted_sast text;
  v_linked_email text;
  v_contact_name text;
  v_owner_message text;
  v_partner_message text;
begin
  if new.status is distinct from 'accepted'
     or old.status is not distinct from 'accepted' then
    return new;
  end if;

  select p.partner_name, p.referral_code, p.partner_user_id
    into v_partner_name, v_referral_code, v_partner_user_id
  from public.partner_programs p
  where p.id = new.partner_id;

  if v_partner_name is null then
    raise warning 'Partner invitation % accepted but partner programme % was not found', new.id, new.partner_id;
    return new;
  end if;

  if v_partner_user_id is not null then
    select u.email into v_linked_email
    from auth.users u
    where u.id = v_partner_user_id;
  end if;

  v_contact_name := coalesce(nullif(trim(new.contact_name), ''), 'Partner contact');
  v_accepted_sast := to_char(
    coalesce(new.accepted_at, now()) at time zone 'Africa/Johannesburg',
    'DD Mon YYYY HH24:MI:SS'
  ) || ' SAST';

  v_owner_message :=
    'Partner organisation: ' || v_partner_name ||
    E'\nPartner contact: ' || v_contact_name ||
    E'\nContact email: ' || new.invited_email ||
    E'\nReferral code: ' || coalesce(v_referral_code, 'Not set') ||
    E'\nAccepted date and time: ' || v_accepted_sast ||
    E'\nLinked Ekhaya account ID: ' || coalesce(v_partner_user_id::text, 'Not linked') ||
    E'\nLinked account email: ' || coalesce(v_linked_email, 'Unavailable') ||
    E'\nConfirmation: The existing partner account is linked.';

  v_partner_message :=
    'Your partner invitation has been accepted.' ||
    E'\nPartner organisation: ' || v_partner_name ||
    E'\nYour existing Ekhaya account is now linked.' ||
    E'\nOrganisation referral code: ' || coalesce(v_referral_code, 'Being finalised') ||
    E'\nAccepted date and time: ' || v_accepted_sast ||
    E'\nAccepted by: ' || v_contact_name || ' (' || new.invited_email || ')' ||
    E'\nLinked Ekhaya account: ' || coalesce(v_linked_email, 'Account linked; email unavailable') ||
    E'\nFor assistance, contact support@ekhayatech.co.za.';

  if new.invited_by is not null then
    insert into public.user_notifications
      (user_id, event_key, notification_type, title, message, email_status)
    values
      (
        new.invited_by,
        'partner-invitation-accepted:owner:' || new.id::text,
        'system',
        v_partner_name || ' accepted the partner invitation',
        v_owner_message,
        'pending'
      )
    on conflict (user_id, event_key) do nothing;
  end if;

  if v_partner_user_id is not null then
    insert into public.user_notifications
      (user_id, event_key, notification_type, title, message, email_status)
    values
      (
        v_partner_user_id,
        'partner-invitation-accepted:welcome:' || new.id::text,
        'system',
        'Welcome to the Ekhaya Technologies Partner Programme',
        v_partner_message,
        'pending'
      )
    on conflict (user_id, event_key) do nothing;
  end if;

  return new;
end;
$function$;

comment on function private.notify_partner_invitation_accepted() is
  'Queues idempotent owner and partner acceptance notifications with SAST acceptance time and linked-account details.';
