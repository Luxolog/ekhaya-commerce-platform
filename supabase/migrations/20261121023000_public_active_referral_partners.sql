create or replace function public.get_active_referral_partners()
returns table (
  id uuid,
  partner_name text,
  partner_slug text,
  referral_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.partner_name, p.partner_slug, p.referral_code
  from public.partner_programs p
  where p.status = 'active'
  order by p.partner_name;
$$;

revoke all on function public.get_active_referral_partners() from public;
grant execute on function public.get_active_referral_partners() to anon, authenticated;
