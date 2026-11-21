-- Seller-owned saved Marketing Intelligence reports.
-- Reports contain seller-supplied context and AI-generated planning analysis, not verified live research.

create table if not exists public.marketing_research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  report_type text not null check (report_type in (
    'competitor_analysis','product_positioning','audience_persona','swot_analysis','marketing_strategy','trend_planning'
  )),
  title text not null check (length(trim(title)) between 1 and 160),
  product_name text,
  product_category text,
  target_market text,
  seller_context text not null check (length(trim(seller_context)) between 12 and 5000),
  report_content text not null check (length(trim(report_content)) between 1 and 20000),
  evidence_mode text not null default 'seller_context_plus_ai_analysis'
    check (evidence_mode = 'seller_context_plus_ai_analysis'),
  seller_notes text not null default '' check (length(seller_notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_research_reports_user_updated_idx
  on public.marketing_research_reports(user_id, updated_at desc);

alter table public.marketing_research_reports enable row level security;

drop policy if exists marketing_research_reports_read_own on public.marketing_research_reports;
create policy marketing_research_reports_read_own
  on public.marketing_research_reports for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists marketing_research_reports_insert_own on public.marketing_research_reports;
create policy marketing_research_reports_insert_own
  on public.marketing_research_reports for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and evidence_mode = 'seller_context_plus_ai_analysis'
  );

drop policy if exists marketing_research_reports_update_own on public.marketing_research_reports;
create policy marketing_research_reports_update_own
  on public.marketing_research_reports for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and evidence_mode = 'seller_context_plus_ai_analysis'
  );

drop policy if exists marketing_research_reports_delete_own on public.marketing_research_reports;
create policy marketing_research_reports_delete_own
  on public.marketing_research_reports for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.marketing_research_reports to authenticated;
grant all privileges on public.marketing_research_reports to service_role;

comment on table public.marketing_research_reports is
  'Seller-owned marketing planning reports based on seller-provided context and AI analysis. Not verified live market research.';
