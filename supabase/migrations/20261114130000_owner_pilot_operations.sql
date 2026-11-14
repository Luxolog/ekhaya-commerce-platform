-- Owner pilot operations: auditable activity and structured seller feedback.
create table if not exists public.seller_pilot_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null,
  query text not null,
  result_count integer not null default 0,
  result_status text not null default 'success',
  source text,
  created_at timestamptz not null default now()
);
create index if not exists seller_pilot_activity_created_idx on public.seller_pilot_activity(created_at desc);
create index if not exists seller_pilot_activity_user_idx on public.seller_pilot_activity(user_id, created_at desc);
alter table public.seller_pilot_activity enable row level security;

create table if not exists public.seller_pilot_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','product_feedback','data_quality','other')),
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists seller_pilot_feedback_created_idx on public.seller_pilot_feedback(created_at desc);
alter table public.seller_pilot_feedback enable row level security;
revoke all on public.seller_pilot_activity, public.seller_pilot_feedback from anon, authenticated;
grant all on public.seller_pilot_activity, public.seller_pilot_feedback to service_role;
grant usage, select on sequence public.seller_pilot_activity_id_seq, public.seller_pilot_feedback_id_seq to service_role;
