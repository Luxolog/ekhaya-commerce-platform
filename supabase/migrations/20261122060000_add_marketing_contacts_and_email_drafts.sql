-- Consent-aware seller contact CRM and email campaign drafts.
create table if not exists public.seller_marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  lead_source text not null default '',
  interest_category text not null default '',
  lead_status text not null default 'new' check (lead_status in ('new','contacted','interested','converted','not_interested','archived')),
  follow_up_at timestamptz,
  notes text not null default '',
  consent_status text not null default 'unknown' check (consent_status in ('unknown','consented','withdrawn')),
  consent_basis text not null default '',
  consent_recorded_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_marketing_contacts_email_format check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint seller_marketing_contacts_consent_consistency check (
    (consent_status <> 'consented' or consent_recorded_at is not null)
    and (consent_status <> 'withdrawn' or opted_out_at is not null)
  )
);
create unique index if not exists seller_marketing_contacts_user_email_unique
  on public.seller_marketing_contacts(user_id, lower(email)) where email is not null;
create index if not exists seller_marketing_contacts_user_status_idx
  on public.seller_marketing_contacts(user_id, lead_status, updated_at desc);

create table if not exists public.seller_marketing_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  campaign_name text not null,
  subject text not null default '',
  preview_text text not null default '',
  body_content text not null default '',
  selected_contact_ids jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','ready_for_review','scheduled_locally','archived')),
  scheduled_for timestamptz,
  provider_status text not null default 'not_configured' check (provider_status in ('not_configured','not_sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_marketing_email_campaigns_contacts_array check (jsonb_typeof(selected_contact_ids) = 'array')
);
create index if not exists seller_marketing_email_campaigns_user_updated_idx
  on public.seller_marketing_email_campaigns(user_id, updated_at desc);

alter table public.seller_marketing_contacts enable row level security;
alter table public.seller_marketing_email_campaigns enable row level security;

drop policy if exists seller_marketing_contacts_select_own on public.seller_marketing_contacts;
create policy seller_marketing_contacts_select_own on public.seller_marketing_contacts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists seller_marketing_contacts_insert_own on public.seller_marketing_contacts;
create policy seller_marketing_contacts_insert_own on public.seller_marketing_contacts for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists seller_marketing_contacts_update_own on public.seller_marketing_contacts;
create policy seller_marketing_contacts_update_own on public.seller_marketing_contacts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists seller_marketing_contacts_delete_own on public.seller_marketing_contacts;
create policy seller_marketing_contacts_delete_own on public.seller_marketing_contacts for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists seller_marketing_email_campaigns_select_own on public.seller_marketing_email_campaigns;
create policy seller_marketing_email_campaigns_select_own on public.seller_marketing_email_campaigns for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists seller_marketing_email_campaigns_insert_own on public.seller_marketing_email_campaigns;
create policy seller_marketing_email_campaigns_insert_own on public.seller_marketing_email_campaigns for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists seller_marketing_email_campaigns_update_own on public.seller_marketing_email_campaigns;
create policy seller_marketing_email_campaigns_update_own on public.seller_marketing_email_campaigns for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists seller_marketing_email_campaigns_delete_own on public.seller_marketing_email_campaigns;
create policy seller_marketing_email_campaigns_delete_own on public.seller_marketing_email_campaigns for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.seller_marketing_contacts to authenticated;
grant select, insert, update, delete on public.seller_marketing_email_campaigns to authenticated;
grant all on public.seller_marketing_contacts to service_role;
grant all on public.seller_marketing_email_campaigns to service_role;

drop trigger if exists seller_marketing_contacts_updated_at on public.seller_marketing_contacts;
create trigger seller_marketing_contacts_updated_at before update on public.seller_marketing_contacts
for each row execute function public.set_seller_marketing_updated_at();
drop trigger if exists seller_marketing_email_campaigns_updated_at on public.seller_marketing_email_campaigns;
create trigger seller_marketing_email_campaigns_updated_at before update on public.seller_marketing_email_campaigns
for each row execute function public.set_seller_marketing_updated_at();
