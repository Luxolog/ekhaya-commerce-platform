-- Execute a claimed automation as one transaction. A create_draft action creates a real seller calendar draft.
-- Other action types create internal inbox events only; no external delivery/publishing occurs.
alter table public.marketing_automation_action_events
  add column if not exists calendar_post_id uuid references public.marketing_calendar_posts(id) on delete set null;

create or replace function public.execute_marketing_automation_action(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.marketing_automation_runs%rowtype;
  v_rule public.marketing_automations%rowtype;
  v_existing public.marketing_automation_action_events%rowtype;
  v_title text;
  v_content text;
  v_platform text;
  v_post_id uuid;
  v_event_id uuid;
begin
  select * into v_run
  from public.marketing_automation_runs
  where id = p_run_id
  for update;

  if not found or v_run.status <> 'running' then
    raise exception 'Automation run is not in a claimable running state';
  end if;

  select * into v_rule
  from public.marketing_automations
  where id = v_run.automation_id and user_id = v_run.user_id
  for update;

  if not found or v_rule.status <> 'active' then
    update public.marketing_automation_runs
      set status = 'skipped', completed_at = now(),
          error_code = 'automation_not_active',
          result_summary = 'Rule was no longer active when the action was executed.'
      where id = v_run.id;
    return jsonb_build_object('status','skipped','reason','automation_not_active');
  end if;

  select * into v_existing
  from public.marketing_automation_action_events
  where run_id = v_run.id;

  if found then
    update public.marketing_automation_runs
      set status = 'succeeded', completed_at = coalesce(completed_at, now()),
          error_code = null,
          result_summary = 'Previously created idempotent action was confirmed.'
      where id = v_run.id;
    return jsonb_build_object('status','succeeded','event_id',v_existing.id,'calendar_post_id',v_existing.calendar_post_id);
  end if;

  v_title := left(coalesce(nullif(trim(v_rule.action_config->>'title'),''),v_rule.name),160);
  v_content := left(coalesce(nullif(trim(v_rule.action_config->>'content'),''),nullif(trim(v_rule.action_config->>'message'),''),v_rule.description),10000);
  v_platform := coalesce(nullif(lower(trim(v_rule.action_config->>'platform')),''),'other');

  if nullif(trim(coalesce(v_content, '')), '') is null then
    update public.marketing_automation_runs
      set status = 'skipped', completed_at = now(),
          error_code = 'action_content_missing',
          result_summary = 'Add action_config.content or message before activating this rule.'
      where id = v_run.id;
    return jsonb_build_object('status','skipped','reason','action_content_missing');
  end if;

  if v_rule.action_type = 'create_draft' then
    if v_platform not in ('facebook','instagram','tiktok','linkedin','other') then
      raise exception 'Unsupported calendar platform in automation action_config';
    end if;
    insert into public.marketing_calendar_posts
      (user_id,title,content,platform,scheduled_for,status)
    values
      (v_run.user_id,v_title,v_content,v_platform,v_run.scheduled_for,'draft')
    returning id into v_post_id;
  end if;

  insert into public.marketing_automation_action_events
    (run_id,automation_id,user_id,action_type,title,body,payload,calendar_post_id)
  values
    (v_run.id,v_rule.id,v_run.user_id,v_rule.action_type,v_title,v_content,
     jsonb_build_object('scheduled_for',v_run.scheduled_for,'automation_name',v_rule.name,'delivery','internal_only'),
     v_post_id)
  returning id into v_event_id;

  update public.marketing_automation_runs
    set status = 'succeeded', completed_at = now(), error_code = null,
        result_summary = case when v_rule.action_type = 'create_draft'
          then 'Seller calendar draft created. No external publishing was performed.'
          else 'Internal seller action recorded. No email or external publishing was performed.'
        end
    where id = v_run.id;

  return jsonb_build_object('status','succeeded','event_id',v_event_id,'calendar_post_id',v_post_id);
end;
$$;
revoke all on function public.execute_marketing_automation_action(uuid) from public, anon, authenticated;
grant execute on function public.execute_marketing_automation_action(uuid) to service_role;

comment on function public.execute_marketing_automation_action(uuid) is
  'Service-role-only transactional action executor. create_draft inserts a seller calendar draft; all other actions remain internal inbox events.';
