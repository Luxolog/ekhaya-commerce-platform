-- Complete campaign planning metadata and reusable seller-owned templates.
alter table public.marketing_campaigns
  add column if not exists target_audience text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists performance_notes text,
  add column if not exists template_id uuid;

create table if not exists public.marketing_campaign_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  objective text,
  target_audience text,
  platform text check (platform is null or platform in ('facebook','instagram','tiktok','linkedin','other')),
  content_prompt text not null check (length(trim(content_prompt)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_campaign_templates_user_updated_idx
  on public.marketing_campaign_templates(user_id, updated_at desc);

alter table public.marketing_campaign_templates enable row level security;
drop policy if exists marketing_campaign_templates_read_own on public.marketing_campaign_templates;
create policy marketing_campaign_templates_read_own
  on public.marketing_campaign_templates for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists marketing_campaign_templates_insert_own on public.marketing_campaign_templates;
create policy marketing_campaign_templates_insert_own
  on public.marketing_campaign_templates for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists marketing_campaign_templates_update_own on public.marketing_campaign_templates;
create policy marketing_campaign_templates_update_own
  on public.marketing_campaign_templates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists marketing_campaign_templates_delete_own on public.marketing_campaign_templates;
create policy marketing_campaign_templates_delete_own
  on public.marketing_campaign_templates for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.marketing_campaigns
  drop constraint if exists marketing_campaigns_template_id_fkey;
alter table public.marketing_campaigns
  add constraint marketing_campaigns_template_id_fkey
  foreign key (template_id) references public.marketing_campaign_templates(id) on delete set null;

grant select, insert, update, delete on public.marketing_campaign_templates to authenticated;
grant all privileges on public.marketing_campaign_templates to service_role;
