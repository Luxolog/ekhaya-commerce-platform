create schema if not exists private;

create table public.sd_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.sd_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  logo_url text,
  brand_primary text,
  brand_secondary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sd_organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','supervisor','agent','viewer')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique (organisation_id,user_id)
);
create table public.sd_departments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (organisation_id,name)
);
create table public.sd_customers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sd_tickets (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  customer_id uuid references public.sd_customers(id) on delete set null,
  department_id uuid references public.sd_departments(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  ticket_number bigint generated always as identity,
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','waiting_on_customer','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  source text not null default 'portal' check (source in ('portal','email','whatsapp','messenger','instagram','live_chat','api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (organisation_id,ticket_number)
);
create table public.sd_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  ticket_id uuid not null references public.sd_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_customer_id uuid references public.sd_customers(id) on delete set null,
  body text not null,
  is_internal_note boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table public.sd_conversations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  customer_id uuid references public.sd_customers(id) on delete set null,
  channel text not null check (channel in ('whatsapp','messenger','instagram','email','live_chat')),
  external_conversation_id text,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  subject text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sd_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  conversation_id uuid not null references public.sd_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  sender_type text not null check (sender_type in ('customer','agent','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text,
  provider_message_id text,
  provider_status text,
  attachments jsonb not null default '[]'::jsonb,
  sent_at timestamptz not null default now()
);
create table public.sd_channel_integrations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','messenger','instagram','email','live_chat')),
  display_name text not null,
  status text not null default 'pending' check (status in ('pending','connected','error','disconnected')),
  external_account_id text,
  secret_ref text,
  settings jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id,channel,display_name)
);
create table public.sd_whatsapp_usage_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sd_organisations(id) on delete cascade,
  integration_id uuid references public.sd_channel_integrations(id) on delete set null,
  provider_message_id text,
  event_type text not null,
  direction text check (direction in ('inbound','outbound')),
  pricing_category text,
  quantity integer not null default 1 check (quantity > 0),
  currency text not null default 'ZAR',
  estimated_cost numeric(12,4),
  actual_cost numeric(12,4),
  provider_cost_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.sd_audit_logs (
  id bigint generated always as identity primary key,
  organisation_id uuid references public.sd_organisations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sd_members_user_idx on public.sd_organisation_members(user_id,status);
create index sd_members_org_idx on public.sd_organisation_members(organisation_id,role);
create index sd_tickets_org_status_idx on public.sd_tickets(organisation_id,status,priority,updated_at desc);
create index sd_tickets_assignee_idx on public.sd_tickets(assigned_to,status);
create index sd_ticket_messages_ticket_idx on public.sd_ticket_messages(ticket_id,created_at);
create index sd_conversations_org_status_idx on public.sd_conversations(organisation_id,status,last_message_at desc);
create index sd_conversation_messages_conversation_idx on public.sd_conversation_messages(conversation_id,sent_at);
create index sd_whatsapp_usage_org_date_idx on public.sd_whatsapp_usage_events(organisation_id,occurred_at);
create index sd_audit_logs_org_date_idx on public.sd_audit_logs(organisation_id,created_at desc);

create or replace function private.sd_is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.sd_platform_admins a
    where a.user_id = (select auth.uid())
  );
$$;
create or replace function private.sd_has_org_role(target_org uuid, allowed_roles text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.sd_is_platform_admin() or exists (
    select 1 from public.sd_organisation_members m
    where m.organisation_id = target_org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;
revoke all on function private.sd_is_platform_admin() from public,anon;
revoke all on function private.sd_has_org_role(uuid,text[]) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.sd_is_platform_admin() to authenticated;
grant execute on function private.sd_has_org_role(uuid,text[]) to authenticated;

alter table public.sd_platform_admins enable row level security;
alter table public.sd_organisations enable row level security;
alter table public.sd_organisation_members enable row level security;
alter table public.sd_departments enable row level security;
alter table public.sd_customers enable row level security;
alter table public.sd_tickets enable row level security;
alter table public.sd_ticket_messages enable row level security;
alter table public.sd_conversations enable row level security;
alter table public.sd_conversation_messages enable row level security;
alter table public.sd_channel_integrations enable row level security;
alter table public.sd_whatsapp_usage_events enable row level security;
alter table public.sd_audit_logs enable row level security;

create policy sd_platform_admins_read_self on public.sd_platform_admins for select to authenticated using (user_id = (select auth.uid()));
create policy sd_organisations_read_member on public.sd_organisations for select to authenticated using (private.sd_has_org_role(id));
create policy sd_organisations_insert_platform on public.sd_organisations for insert to authenticated with check (private.sd_is_platform_admin());
create policy sd_organisations_update_admin on public.sd_organisations for update to authenticated using (private.sd_has_org_role(id,array['owner','admin'])) with check (private.sd_has_org_role(id,array['owner','admin']));
create policy sd_members_read_org on public.sd_organisation_members for select to authenticated using (private.sd_has_org_role(organisation_id));
create policy sd_members_manage_org on public.sd_organisation_members for all to authenticated using (private.sd_has_org_role(organisation_id,array['owner','admin'])) with check (private.sd_has_org_role(organisation_id,array['owner','admin']));
create policy sd_departments_org_access on public.sd_departments for all to authenticated using (private.sd_has_org_role(organisation_id)) with check (private.sd_has_org_role(organisation_id,array['owner','admin','supervisor']));
create policy sd_customers_org_access on public.sd_customers for all to authenticated using (private.sd_has_org_role(organisation_id)) with check (private.sd_has_org_role(organisation_id));
create policy sd_tickets_org_access on public.sd_tickets for all to authenticated using (private.sd_has_org_role(organisation_id)) with check (private.sd_has_org_role(organisation_id));
create policy sd_ticket_messages_org_access on public.sd_ticket_messages for all to authenticated using (private.sd_has_org_role(organisation_id)) with check (private.sd_has_org_role(organisation_id));
create policy sd_conversations_org_access on public.sd_conversations for all to authenticated using (private.sd_has_org_role(organisation_id)) with check (private.sd_has_org_role(organisation_id));
create policy sd_conversation_messages_org_access on public.sd_conversation_messages for all to authenticated using (private.sd_has_org_role(organisation_id)) with check (private.sd_has_org_role(organisation_id));
create policy sd_integrations_admin_access on public.sd_channel_integrations for all to authenticated using (private.sd_has_org_role(organisation_id,array['owner','admin'])) with check (private.sd_has_org_role(organisation_id,array['owner','admin']));
create policy sd_whatsapp_usage_admin_access on public.sd_whatsapp_usage_events for all to authenticated using (private.sd_has_org_role(organisation_id,array['owner','admin'])) with check (private.sd_has_org_role(organisation_id,array['owner','admin']));
create policy sd_audit_logs_read_admin on public.sd_audit_logs for select to authenticated using (private.sd_has_org_role(organisation_id,array['owner','admin']));
create policy sd_audit_logs_insert_member on public.sd_audit_logs for insert to authenticated with check (private.sd_has_org_role(organisation_id));

grant select,insert,update,delete on public.sd_platform_admins,public.sd_organisations,public.sd_organisation_members,public.sd_departments,public.sd_customers,public.sd_tickets,public.sd_ticket_messages,public.sd_conversations,public.sd_conversation_messages,public.sd_channel_integrations,public.sd_whatsapp_usage_events,public.sd_audit_logs to authenticated;
grant usage,select on all sequences in schema public to authenticated;
