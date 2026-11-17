-- Reconstructed from pg_get_functiondef and function ACLs on 2026-11-16.
-- These RPCs are present in the live database but were not recorded in migration history.
-- Keep this file as a forward-replay migration for a fresh environment; do not apply it
-- to the current production project where both functions already exist.

CREATE OR REPLACE FUNCTION public.sd_create_ticket_with_first_message(
  p_organisation_id uuid,
  p_subject text,
  p_description text,
  p_priority text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_ticket_id uuid;
  v_email text := nullif(lower(trim(p_customer_email)), '');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='28000'; END IF;
  IF p_organisation_id IS NULL OR nullif(trim(p_subject),'') IS NULL OR nullif(trim(p_description),'') IS NULL OR nullif(trim(p_customer_name),'') IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'Complete all required ticket fields' USING errcode='22023';
  END IF;
  IF p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Invalid ticket priority' USING errcode='22023'; END IF;
  IF NOT private.sd_has_org_role(p_organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]) THEN
    RAISE EXCEPTION 'Workspace access denied' USING errcode='42501';
  END IF;
  SELECT c.id INTO v_customer_id FROM public.sd_customers c
  WHERE c.organisation_id=p_organisation_id AND lower(c.email)=v_email
  ORDER BY c.created_at ASC LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.sd_customers(organisation_id,full_name,email,phone)
    VALUES(p_organisation_id,trim(p_customer_name),v_email,nullif(trim(coalesce(p_customer_phone,'')),''))
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.sd_customers SET full_name=trim(p_customer_name),
      phone=coalesce(nullif(trim(coalesce(p_customer_phone,'')),''),phone), updated_at=now()
    WHERE id=v_customer_id AND organisation_id=p_organisation_id;
  END IF;
  INSERT INTO public.sd_tickets(organisation_id,customer_id,subject,description,priority,source)
  VALUES(p_organisation_id,v_customer_id,trim(p_subject),trim(p_description),p_priority,'portal')
  RETURNING id INTO v_ticket_id;
  INSERT INTO public.sd_ticket_messages(organisation_id,ticket_id,author_user_id,body,is_internal_note)
  VALUES(p_organisation_id,v_ticket_id,v_user_id,trim(p_description),false);
  RETURN v_ticket_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.sd_create_ticket_with_first_message(uuid,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sd_create_ticket_with_first_message(uuid,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sd_assign_ticket(
  p_organisation_id uuid,
  p_ticket_id uuid,
  p_assigned_to uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='28000'; END IF;
  IF NOT private.sd_has_org_role(p_organisation_id, ARRAY['owner','admin','supervisor']::text[]) THEN
    RAISE EXCEPTION 'Only workspace owners, admins or supervisors can route tickets' USING errcode='42501';
  END IF;
  IF p_assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sd_organisation_members m
    WHERE m.organisation_id=p_organisation_id AND m.user_id=p_assigned_to
      AND m.status='active' AND m.role IN ('agent','supervisor')
  ) THEN RAISE EXCEPTION 'Assignee must be an active agent or supervisor in this workspace' USING errcode='22023'; END IF;
  IF p_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sd_departments d WHERE d.id=p_department_id AND d.organisation_id=p_organisation_id
  ) THEN RAISE EXCEPTION 'Department does not belong to this workspace' USING errcode='22023'; END IF;
  UPDATE public.sd_tickets SET assigned_to=p_assigned_to, department_id=p_department_id, updated_at=now()
  WHERE id=p_ticket_id AND organisation_id=p_organisation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found or access denied' USING errcode='P0002'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.sd_assign_ticket(uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sd_assign_ticket(uuid,uuid,uuid,uuid) TO authenticated;