-- Queue one email notification for the partner that owns a unique-link referral.
-- This migration is intentionally committed to GitHub only; it has not been applied to Supabase.

create or replace function private.capture_partner_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text;
  v_partner_id uuid;
  v_partner_user_id uuid;
  v_partner_name text;
  v_referral_id uuid;
  v_seller_name text;
  v_registered_at text;
begin
  if new.email is null
     or coalesce(new.raw_app_meta_data->>'role', 'seller') = 'owner' then
    return new;
  end if;

  -- Only registrations that arrived with the partner's unique URL/cookie qualify.
  -- A partner selected manually on the signup form is not a link referral.
  if lower(coalesce(new.raw_user_meta_data->>'referral_method', '')) <> 'unique_link' then
    return new;
  end if;

  v_code := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  if v_code = '' then
    return new;
  end if;

  select p.id, p.partner_user_id, p.partner_name
    into v_partner_id, v_partner_user_id, v_partner_name
  from public.partner_programs p
  where upper(p.referral_code) = v_code
    and p.status = 'active'
  limit 1;

  if v_partner_id is null then
    return new;
  end if;

  insert into public.partner_referrals (partner_id, referred_user_id, referral_code)
  values (v_partner_id, new.id, v_code)
  on conflict (referred_user_id) do nothing
  returning id into v_referral_id;

  -- The notification is created only for the exact partner linked to this referral.
  -- The referral insert and notification insert are in the same transaction.
  if v_referral_id is not null and v_partner_user_id is not null then
    v_seller_name := coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      'A new seller'
    );
    v_registered_at := to_char(
      now() at time zone 'Africa/Johannesburg',
      'DD Mon YYYY HH24:MI'
    ) || ' SAST';

    insert into public.user_notifications
      (user_id, event_key, notification_type, title, message, action_url, email_status)
    values
      (
        v_partner_user_id,
        'partner-referral:new:' || v_referral_id::text,
        'partner_referral',
        'A new seller registered through your partner link',
        'A new seller has registered through your unique Ekhaya partner referral link.'
          || E'\n\\nPartner: ' || coalesce(v_partner_name, 'Your partner programme')
          || E'\nSeller: ' || v_seller_name
          || E'\nRegistered: ' || v_registered_at
          || E'\nReferral status: Pending review'
          || E'\n\\nThis is a signup notification only. It does not accept the referral or create a commission. Sign in to your Partner Portal to review the referral.',
        'https://ekhayatech.co.za/partner/',
        'pending'
      )
    on conflict (user_id, event_key) do nothing;
  end if;

  return new;
end;
$function$;
