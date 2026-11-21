-- Optional structured planning metadata for seller-created marketing campaigns.
alter table public.marketing_campaigns
  add column if not exists budget_zar numeric(12,2),
  add column if not exists posting_frequency text,
  add column if not exists review_date date;

alter table public.marketing_campaigns
  drop constraint if exists marketing_campaigns_budget_nonnegative;
alter table public.marketing_campaigns
  add constraint marketing_campaigns_budget_nonnegative
  check (budget_zar is null or budget_zar >= 0);

comment on column public.marketing_campaigns.budget_zar is
  'Seller-entered planning budget only. Ekhaya does not manage or spend advertising budgets.';
comment on column public.marketing_campaigns.posting_frequency is
  'Seller planning preference; no external publishing scheduler is implied.';
