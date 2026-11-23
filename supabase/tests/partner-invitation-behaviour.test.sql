begin;

select plan(11);

-- Synthetic identities and invitation fixtures only; transaction is rolled back.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b9100000-0000-4000-8000-000000000001','authenticated','authenticated',
  'batch10-owner@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

insert into public.partner_programs (
  id, partner_name, partner_slug, referral_code, status
) values (
  'b9100000-0000-4000-8000-000000000011',
  'Batch 10 Invitation Partner','batch10-invitation','BATCH10OLD','pending'
);

insert into public.partner_invitations (
  id, partner_id, invited_email, invited_by, status, expires_at, contact_name
) values (
  'b9100000-0000-4000-8000-000000000021',
  'b9100000-0000-4000-8000-000000000011',
  'batch10-invitee@example.invalid',
  'b9100000-0000-4000-8000-000000000001',
  'pending', now() + interval '7 days', 'Batch 10 Invitee'
);

insert into public.partner_invitations (
  id, partner_id, invited_email, invited_by, status, expires_at, contact_name
) values
(
  'b9100000-0000-4000-8000-000000000022',
  'b9100000-0000-4000-8000-000000000011',
  'batch10-expired@example.invalid',
  'b9100000-0000-4000-8000-000000000001',
  'pending', now() - interval '1 minute', 'Expired Invitee'
),
(
  'b9100000-0000-4000-8000-000000000023',
  'b9100000-0000-4000-8000-000000000011',
  'batch10-revoked@example.invalid',
  'b9100000-0000-4000-8000-000000000001',
  'revoked', now() + interval '7 days', 'Revoked Invitee'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b9100000-0000-4000-8000-000000000002','authenticated','authenticated',
  'batch10-invitee@example.invalid','',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);


select throws_ok(
  $$select public.accept_saechamber_partner_invitation(
    'b9100000-0000-4000-8000-000000000021',
    'b9100000-0000-4000-8000-000000000002',
    'attacker@example.invalid',
    'BATCH10NEW'
  )$$,
  'P0001',
  'INVITATION_INVALID_EXPIRED_OR_ALREADY_USED',
  'invitation cannot be accepted by a different email address'
);

select is(
  public.accept_saechamber_partner_invitation(
    'b9100000-0000-4000-8000-000000000021',
    'b9100000-0000-4000-8000-000000000002',
    'batch10-invitee@example.invalid',
    'BATCH10NEW'
  )->>'partner_user_id',
  'b9100000-0000-4000-8000-000000000002',
  'valid acceptance links the invited Ekhaya account'
);

select is(
  (select status from public.partner_invitations
   where id='b9100000-0000-4000-8000-000000000021'),
  'accepted',
  'valid acceptance transitions the invitation to accepted'
);

select ok(
  (select accepted_at is not null from public.partner_invitations
   where id='b9100000-0000-4000-8000-000000000021'),
  'valid acceptance records the acceptance timestamp'
);

select is(
  (select status from public.partner_programs
   where id='b9100000-0000-4000-8000-000000000011'),
  'pending',
  'accepting an invitation does not silently activate the partner programme'
);

select is(
  (select count(*)::integer from public.user_notifications
   where user_id='b9100000-0000-4000-8000-000000000001'
     and event_key='partner-invitation-accepted:owner:b9100000-0000-4000-8000-000000000021'),
  1,
  'acceptance queues exactly one owner notification'
);

select is(
  (select count(*)::integer from public.user_notifications
   where user_id='b9100000-0000-4000-8000-000000000002'
     and event_key='partner-invitation-accepted:welcome:b9100000-0000-4000-8000-000000000021'),
  1,
  'acceptance queues exactly one partner welcome notification'
);

select throws_ok(
  $$select public.accept_saechamber_partner_invitation(
    'b9100000-0000-4000-8000-000000000021',
    'b9100000-0000-4000-8000-000000000002',
    'batch10-invitee@example.invalid',
    'BATCH10NEW'
  )$$,
  'P0001',
  'INVITATION_INVALID_EXPIRED_OR_ALREADY_USED',
  'replayed acceptance is rejected after the invitation is consumed'
);

select is(
  (select count(*)::integer from public.user_notifications
   where event_key in (
     'partner-invitation-accepted:owner:b9100000-0000-4000-8000-000000000021',
     'partner-invitation-accepted:welcome:b9100000-0000-4000-8000-000000000021'
   )),
  2,
  'replayed acceptance does not duplicate either notification'
);

select throws_ok(
  $q$select public.accept_saechamber_partner_invitation(
    'b9100000-0000-4000-8000-000000000022',
    'b9100000-0000-4000-8000-000000000002',
    'batch10-expired@example.invalid',
    'BATCH10EXP'
  )$q$,
  'P0001',
  'INVITATION_INVALID_EXPIRED_OR_ALREADY_USED',
  'expired invitation cannot be accepted'
);

select throws_ok(
  $q$select public.accept_saechamber_partner_invitation(
    'b9100000-0000-4000-8000-000000000023',
    'b9100000-0000-4000-8000-000000000002',
    'batch10-revoked@example.invalid',
    'BATCH10REV'
  )$q$,
  'P0001',
  'INVITATION_INVALID_EXPIRED_OR_ALREADY_USED',
  'revoked invitation cannot be accepted'
);

select * from finish();
rollback;
