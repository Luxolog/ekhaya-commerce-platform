-- Seller-owned seven-day content calendar for Ekhaya AI Marketing.
-- This is a draft/approval workspace only; no social publishing or background scheduler is enabled.

create table if not exists public.marketing_calendar_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 160),
  content text not null check (length(trim(content)) between 1 and 10000),
  platform text not null check (platform in ('facebook','instagram','tiktok','linkedin','other')),
  scheduled_for timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft','approved','archived')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_calendar_posts_user_schedule_idx
  on public.marketing_calendar_posts(user_id, scheduled_for asc);
create index if not exists marketing_calendar_posts_user_status_idx
  on public.marketing_calendar_posts(user_id, status, updated_at desc);

alter table public.marketing_calendar_posts enable row level security;

drop policy if exists marketing_calendar_posts_read_own on public.marketing_calendar_posts;
create policy marketing_calendar_posts_read_own
  on public.marketing_calendar_posts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists marketing_calendar_posts_insert_draft on public.marketing_calendar_posts;
create policy marketing_calendar_posts_insert_draft
  on public.marketing_calendar_posts for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'draft' and approved_at is null);

drop policy if exists marketing_calendar_posts_update_own on public.marketing_calendar_posts;
create policy marketing_calendar_posts_update_own
  on public.marketing_calendar_posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and status in ('draft','approved','archived')
    and (status <> 'approved' or approved_at is not null)
  );

drop policy if exists marketing_calendar_posts_delete_own on public.marketing_calendar_posts;
create policy marketing_calendar_posts_delete_own
  on public.marketing_calendar_posts for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.marketing_calendar_posts is
  'Seller-owned AI marketing calendar drafts. Approved means seller-reviewed only; this table does not publish or schedule posts to external platforms.';

-- Explicit Data API privileges for the seller-owned calendar.
grant select, insert, update, delete on public.marketing_calendar_posts to authenticated;
grant all privileges on public.marketing_calendar_posts to service_role;
