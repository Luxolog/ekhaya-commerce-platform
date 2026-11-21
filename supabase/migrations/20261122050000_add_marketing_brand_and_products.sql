-- Seller-owned AI Marketing brand profiles and product catalogue.
-- Apply only after reviewing and validating in a non-production database.
create table if not exists public.seller_marketing_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_name text not null default '',
  business_description text not null default '',
  industry text not null default '',
  website_url text,
  product_categories jsonb not null default '[]'::jsonb,
  target_customers text not null default '',
  target_markets jsonb not null default '[]'::jsonb,
  brand_personality text not null default '',
  brand_voice text not null default '',
  preferred_writing_style text not null default '',
  preferred_languages jsonb not null default '["English"]'::jsonb,
  business_objectives text not null default '',
  competitor_names jsonb not null default '[]'::jsonb,
  approved_product_facts text not null default '',
  prohibited_claims text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_marketing_brand_profiles_user_unique unique (user_id),
  constraint seller_marketing_brand_profiles_json_arrays check (
    jsonb_typeof(product_categories) = 'array'
    and jsonb_typeof(target_markets) = 'array'
    and jsonb_typeof(preferred_languages) = 'array'
    and jsonb_typeof(competitor_names) = 'array'
  )
);

create table if not exists public.seller_marketing_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid references public.seller_marketing_brand_profiles(id) on delete set null,
  product_name text not null,
  product_description text not null default '',
  selling_price numeric(12,2),
  currency text not null default 'ZAR',
  product_category text not null default '',
  image_reference text,
  product_benefits text not null default '',
  verified_specifications text not null default '',
  target_audience text not null default '',
  promotional_information text not null default '',
  stock_information text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_marketing_products_price_nonnegative check (selling_price is null or selling_price >= 0),
  constraint seller_marketing_products_brand_fk
    foreign key (brand_profile_id)
    references public.seller_marketing_brand_profiles(id)
    on delete set null
);

create index if not exists seller_marketing_products_user_updated_idx
  on public.seller_marketing_products(user_id, updated_at desc);
create index if not exists seller_marketing_products_brand_idx
  on public.seller_marketing_products(brand_profile_id);

alter table public.seller_marketing_brand_profiles enable row level security;
alter table public.seller_marketing_products enable row level security;

drop policy if exists seller_marketing_brand_profiles_select_own on public.seller_marketing_brand_profiles;
create policy seller_marketing_brand_profiles_select_own on public.seller_marketing_brand_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists seller_marketing_brand_profiles_insert_own on public.seller_marketing_brand_profiles;
create policy seller_marketing_brand_profiles_insert_own on public.seller_marketing_brand_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists seller_marketing_brand_profiles_update_own on public.seller_marketing_brand_profiles;
create policy seller_marketing_brand_profiles_update_own on public.seller_marketing_brand_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists seller_marketing_brand_profiles_delete_own on public.seller_marketing_brand_profiles;
create policy seller_marketing_brand_profiles_delete_own on public.seller_marketing_brand_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists seller_marketing_products_select_own on public.seller_marketing_products;
create policy seller_marketing_products_select_own on public.seller_marketing_products
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists seller_marketing_products_insert_own on public.seller_marketing_products;
create policy seller_marketing_products_insert_own on public.seller_marketing_products
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (brand_profile_id is null or exists (
      select 1 from public.seller_marketing_brand_profiles b
      where b.id = brand_profile_id and b.user_id = (select auth.uid())
    ))
  );
drop policy if exists seller_marketing_products_update_own on public.seller_marketing_products;
create policy seller_marketing_products_update_own on public.seller_marketing_products
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and (brand_profile_id is null or exists (
      select 1 from public.seller_marketing_brand_profiles b
      where b.id = brand_profile_id and b.user_id = (select auth.uid())
    ))
  );
drop policy if exists seller_marketing_products_delete_own on public.seller_marketing_products;
create policy seller_marketing_products_delete_own on public.seller_marketing_products
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.seller_marketing_brand_profiles to authenticated;
grant select, insert, update, delete on public.seller_marketing_products to authenticated;
grant all on public.seller_marketing_brand_profiles to service_role;
grant all on public.seller_marketing_products to service_role;

create or replace function public.set_seller_marketing_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seller_marketing_brand_profiles_updated_at on public.seller_marketing_brand_profiles;
create trigger seller_marketing_brand_profiles_updated_at
before update on public.seller_marketing_brand_profiles
for each row execute function public.set_seller_marketing_updated_at();

drop trigger if exists seller_marketing_products_updated_at on public.seller_marketing_products;
create trigger seller_marketing_products_updated_at
before update on public.seller_marketing_products
for each row execute function public.set_seller_marketing_updated_at();
