-- Atomic quota enforcement for the Ekhaya AI Marketing add-on.
-- Only the trusted Edge Function service role can consume or release usage.

create or replace function public.consume_marketing_usage(
  p_user_id uuid,
  p_feature_code text,
  p_quantity integer,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription public.seller_marketing_subscriptions%rowtype;
  v_plan public.marketing_plans%rowtype;
  v_limit integer;
  v_used integer;
  v_event_id uuid;
begin
  if p_user_id is null or p_feature_code not in ('ai_post','campaign_idea','research_query','trend_report')
     or p_quantity is null or p_quantity < 1 or p_quantity > 1
     or p_idempotency_key is null or length(p_idempotency_key) < 12 or length(p_idempotency_key) > 128 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select id into v_event_id
  from public.marketing_usage_events
  where idempotency_key = p_idempotency_key
    and user_id = p_user_id;

  if v_event_id is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'event_id', v_event_id);
  end if;

  select * into v_subscription
  from public.seller_marketing_subscriptions
  where user_id = p_user_id
    and status = 'active'
    and current_period_start <= now()
    and current_period_end > now()
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'active_subscription_required');
  end if;

  select * into v_plan
  from public.marketing_plans
  where code = v_subscription.plan_code
    and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'plan_unavailable');
  end if;

  v_limit := case p_feature_code
    when 'ai_post' then v_plan.monthly_ai_posts
    when 'campaign_idea' then v_plan.monthly_campaign_ideas
    when 'research_query' then v_plan.monthly_research_queries
    when 'trend_report' then v_plan.monthly_trend_reports
  end;

  select coalesce(sum(quantity), 0)::integer into v_used
  from public.marketing_usage_events
  where user_id = p_user_id
    and feature_code = p_feature_code
    and created_at >= v_subscription.current_period_start
    and created_at < v_subscription.current_period_end;

  if v_used + p_quantity > v_limit then
    return jsonb_build_object(
      'ok', false, 'reason', 'allowance_exceeded',
      'feature_code', p_feature_code, 'used', v_used, 'limit', v_limit
    );
  end if;

  insert into public.marketing_usage_events(
    user_id, subscription_id, feature_code, quantity, idempotency_key, metadata
  ) values (
    p_user_id, v_subscription.id, p_feature_code, p_quantity, p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'event_id', v_event_id,
    'feature_code', p_feature_code, 'used', v_used + p_quantity, 'limit', v_limit,
    'remaining', greatest(v_limit - v_used - p_quantity, 0)
  );
end;
$$;

create or replace function public.release_marketing_usage(
  p_user_id uuid,
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if p_user_id is null or p_idempotency_key is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  delete from public.marketing_usage_events
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.consume_marketing_usage(uuid,text,integer,text,jsonb) from public, anon, authenticated;
revoke all on function public.release_marketing_usage(uuid,text) from public, anon, authenticated;
grant execute on function public.consume_marketing_usage(uuid,text,integer,text,jsonb) to service_role;
grant execute on function public.release_marketing_usage(uuid,text) to service_role;
