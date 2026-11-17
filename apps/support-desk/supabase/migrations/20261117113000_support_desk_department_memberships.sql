-- Department membership and administration foundation.
-- A person can belong to multiple departments; departments never consume seats.

create table if not exists public.sd_department_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  department_id uuid not null references public.sd_departments(id) on delete cascade,
  organisation_member_id uuid not null references public.sd_organisation_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (department_id, organisation_member_id)
);

create index if not exists sd_department_members_org_idx
  on public.sd_department_members(organisation_id, department_id);

create or replace function private.sd_validate_department_member_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department_org uuid;
  v_member_org uuid;
  v_member_role text;
  v_member_status text;
begin
  select d.organisation_id into v_department_org
  from public.sd_departments d where d.id = new.department_id;

  select m.organisation_id, m.role, m.status
    into v_member_org, v_member_role, v_member_status
  from public.sd_organisation_members m where m.id = new.organisation_member_id;

  if v_department_org is null or v_member_org is null
     or v_department_org <> new.organisation_id
     or v_member_org <> new.organisation_id then
    raise exception 'Department and staff member must belong to the same organisation.'
      using errcode = '23514';
  end if;

  if v_member_role not in ('agent','supervisor') or v_member_status <> 'active' then
    raise exception 'Only active agents and supervisors can be assigned to departments.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists sd_department_member_tenant_guard on public.sd_department_members;
create trigger sd_department_member_tenant_guard
before insert or update of organisation_id, department_id, organisation_member_id
on public.sd_department_members
for each row execute function private.sd_validate_department_member_tenant();

alter table public.sd_department_members enable row level security;
drop policy if exists sd_department_members_read_org on public.sd_department_members;
create policy sd_department_members_read_org
on public.sd_department_members for select to authenticated
using (private.sd_has_org_role(organisation_id));

drop policy if exists sd_department_members_manage_org on public.sd_department_members;
create policy sd_department_members_manage_org
on public.sd_department_members for all to authenticated
using (private.sd_has_org_role(organisation_id, array['owner','admin','supervisor']::text[]))
with check (private.sd_has_org_role(organisation_id, array['owner','admin','supervisor']::text[]));

grant select, insert, update, delete on public.sd_department_members to authenticated;
revoke all on function private.sd_validate_department_member_tenant() from public, anon, authenticated;

comment on table public.sd_department_members is
  'Maps active agents and supervisors to one or more departments within the same organisation. Departments are unlimited and do not consume seats.';
