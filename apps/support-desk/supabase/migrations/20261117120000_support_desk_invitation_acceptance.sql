-- Allow an invited user to accept their own organisation membership.
-- The invite email's verified Auth session is the proof of email ownership.

create or replace function public.sd_accept_organisation_invitation(p_organisation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication is required to accept an invitation.'
      using errcode = '42501';
  end if;

  update public.sd_organisation_members m
     set status = 'active'
   where m.organisation_id = p_organisation_id
     and m.user_id = v_user_id
     and m.status = 'invited';

  if not found then
    if exists (
      select 1 from public.sd_organisation_members m
      where m.organisation_id = p_organisation_id
        and m.user_id = v_user_id
        and m.status = 'active'
    ) then
      return;
    end if;
    raise exception 'No pending invitation was found for this account and workspace.'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.sd_accept_organisation_invitation(uuid) from public, anon;
grant execute on function public.sd_accept_organisation_invitation(uuid) to authenticated;

comment on function public.sd_accept_organisation_invitation(uuid) is
  'Activates only the authenticated user own pending invitation for the specified organisation.';
