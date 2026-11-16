-- Reconstructed from the live catalog on 2026-11-16.
-- The policies below enforce internal-message visibility and conversation access.
DO $migration$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('sd_conversation_messages','sd_conversation_messages_delete', $p$CREATE POLICY sd_conversation_messages_delete ON public.sd_conversation_messages FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_conversation_messages','sd_conversation_messages_insert', $p$CREATE POLICY sd_conversation_messages_insert ON public.sd_conversation_messages FOR INSERT TO authenticated WITH CHECK (sender_user_id=(SELECT auth.uid()) AND sender_type='agent' AND private.sd_can_access_conversation(organisation_id,conversation_id) AND private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]))$p$),
      ('sd_conversation_messages','sd_conversation_messages_read', $p$CREATE POLICY sd_conversation_messages_read ON public.sd_conversation_messages FOR SELECT TO authenticated USING (private.sd_can_access_conversation(organisation_id,conversation_id) AND (direction <> 'internal' OR private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[])))$p$),
      ('sd_conversation_messages','sd_conversation_messages_update', $p$CREATE POLICY sd_conversation_messages_update ON public.sd_conversation_messages FOR UPDATE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[]))$p$),
      ('sd_conversations','sd_conversations_delete', $p$CREATE POLICY sd_conversations_delete ON public.sd_conversations FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_conversations','sd_conversations_insert', $p$CREATE POLICY sd_conversations_insert ON public.sd_conversations FOR INSERT TO authenticated WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]))$p$),
      ('sd_conversations','sd_conversations_read', $p$CREATE POLICY sd_conversations_read ON public.sd_conversations FOR SELECT TO authenticated USING (private.sd_is_platform_admin() OR (private.sd_has_org_role(organisation_id) AND (EXISTS (SELECT 1 FROM public.sd_organisation_members m WHERE m.organisation_id=sd_conversations.organisation_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role IN ('owner','admin','supervisor','viewer')) OR assigned_to=(SELECT auth.uid()))))$p$),
      ('sd_conversations','sd_conversations_update', $p$CREATE POLICY sd_conversations_update ON public.sd_conversations FOR UPDATE TO authenticated USING (private.sd_is_platform_admin() OR private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[]) OR (assigned_to=(SELECT auth.uid()) AND private.sd_has_org_role(organisation_id, ARRAY['agent']::text[]))) WITH CHECK (private.sd_is_platform_admin() OR private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[]) OR (assigned_to=(SELECT auth.uid()) AND private.sd_has_org_role(organisation_id, ARRAY['agent']::text[])))$p$),
      ('sd_ticket_messages','sd_ticket_messages_delete', $p$CREATE POLICY sd_ticket_messages_delete ON public.sd_ticket_messages FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_ticket_messages','sd_ticket_messages_insert', $p$CREATE POLICY sd_ticket_messages_insert ON public.sd_ticket_messages FOR INSERT TO authenticated WITH CHECK (author_user_id=(SELECT auth.uid()) AND private.sd_can_manage_ticket(organisation_id,ticket_id))$p$),
      ('sd_ticket_messages','sd_ticket_messages_read', $p$CREATE POLICY sd_ticket_messages_read ON public.sd_ticket_messages FOR SELECT TO authenticated USING (private.sd_can_access_ticket(organisation_id,ticket_id) AND (NOT is_internal_note OR private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[])))$p$),
      ('sd_ticket_messages','sd_ticket_messages_update', $p$CREATE POLICY sd_ticket_messages_update ON public.sd_ticket_messages FOR UPDATE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[]))$p$)
    ) AS policies(tablename, policyname, ddl)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=p.tablename AND policyname=p.policyname) THEN
      EXECUTE p.ddl;
    END IF;
  END LOOP;
END
$migration$;

CREATE INDEX IF NOT EXISTS sd_conversation_messages_conversation_idx ON public.sd_conversation_messages (conversation_id, sent_at);
CREATE INDEX IF NOT EXISTS sd_conversation_messages_conversation_org_idx ON public.sd_conversation_messages (conversation_id, organisation_id);
CREATE INDEX IF NOT EXISTS sd_conversation_messages_org_sender_idx ON public.sd_conversation_messages (organisation_id, sender_user_id);
CREATE INDEX IF NOT EXISTS sd_conversation_messages_sender_user_idx ON public.sd_conversation_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS sd_conversations_assigned_idx ON public.sd_conversations (assigned_to);
CREATE INDEX IF NOT EXISTS sd_conversations_customer_org_idx ON public.sd_conversations (customer_id, organisation_id);
CREATE INDEX IF NOT EXISTS sd_conversations_org_assigned_idx ON public.sd_conversations (organisation_id, assigned_to);
CREATE INDEX IF NOT EXISTS sd_conversations_org_status_idx ON public.sd_conversations (organisation_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS sd_ticket_messages_author_user_idx ON public.sd_ticket_messages (author_user_id);
CREATE INDEX IF NOT EXISTS sd_ticket_messages_customer_idx ON public.sd_ticket_messages (author_customer_id, organisation_id);
CREATE INDEX IF NOT EXISTS sd_ticket_messages_org_author_idx ON public.sd_ticket_messages (organisation_id, author_user_id);
CREATE INDEX IF NOT EXISTS sd_ticket_messages_org_customer_idx ON public.sd_ticket_messages (organisation_id, author_customer_id);
CREATE INDEX IF NOT EXISTS sd_ticket_messages_ticket_idx ON public.sd_ticket_messages (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS sd_ticket_messages_ticket_org_idx ON public.sd_ticket_messages (ticket_id, organisation_id);

CREATE OR REPLACE FUNCTION private.sd_audit_ticket_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_org uuid; v_entity_id text; v_action text; v_details jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_org := NEW.organisation_id; v_entity_id := NEW.id::text; v_action := 'ticket.created';
    v_details := jsonb_build_object('ticket_number',NEW.ticket_number,'status',NEW.status,'priority',NEW.priority,'assigned_to',NEW.assigned_to,'department_id',NEW.department_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.priority IS NOT DISTINCT FROM NEW.priority AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to AND OLD.department_id IS NOT DISTINCT FROM NEW.department_id THEN RETURN NEW; END IF;
    v_org := NEW.organisation_id; v_entity_id := NEW.id::text; v_action := 'ticket.updated';
    v_details := jsonb_build_object('changes',jsonb_strip_nulls(jsonb_build_object(
      'status',CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN jsonb_build_object('from',OLD.status,'to',NEW.status) END,
      'priority',CASE WHEN OLD.priority IS DISTINCT FROM NEW.priority THEN jsonb_build_object('from',OLD.priority,'to',NEW.priority) END,
      'assigned_to',CASE WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN jsonb_build_object('from',OLD.assigned_to,'to',NEW.assigned_to) END,
      'department_id',CASE WHEN OLD.department_id IS DISTINCT FROM NEW.department_id THEN jsonb_build_object('from',OLD.department_id,'to',NEW.department_id) END)));
  ELSE
    v_org := OLD.organisation_id; v_entity_id := OLD.id::text; v_action := 'ticket.deleted';
    v_details := jsonb_build_object('ticket_number',OLD.ticket_number,'subject',OLD.subject);
  END IF;
  IF v_actor IS NOT NULL THEN
    INSERT INTO public.sd_audit_logs(organisation_id,actor_user_id,action,entity_type,entity_id,details)
    VALUES(v_org,v_actor,v_action,'ticket',v_entity_id,v_details);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.sd_audit_ticket_message()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_org uuid; v_entity_id text; v_action text; v_details jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_org := NEW.organisation_id; v_entity_id := NEW.id::text;
    v_action := CASE WHEN NEW.is_internal_note THEN 'ticket.internal_note_added' ELSE 'ticket.reply_added' END;
    v_details := jsonb_build_object('ticket_id',NEW.ticket_id,'is_internal_note',NEW.is_internal_note);
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organisation_id; v_entity_id := NEW.id::text; v_action := 'ticket.message_updated';
    v_details := jsonb_build_object('ticket_id',NEW.ticket_id,'is_internal_note',NEW.is_internal_note);
  ELSE
    v_org := OLD.organisation_id; v_entity_id := OLD.id::text; v_action := 'ticket.message_deleted';
    v_details := jsonb_build_object('ticket_id',OLD.ticket_id,'is_internal_note',OLD.is_internal_note);
  END IF;
  IF v_actor IS NOT NULL THEN
    INSERT INTO public.sd_audit_logs(organisation_id,actor_user_id,action,entity_type,entity_id,details)
    VALUES(v_org,v_actor,v_action,'ticket_message',v_entity_id,v_details);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sd_tickets_audit_changes ON public.sd_tickets;
CREATE TRIGGER sd_tickets_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.sd_tickets
FOR EACH ROW EXECUTE FUNCTION private.sd_audit_ticket_changes();
DROP TRIGGER IF EXISTS sd_ticket_messages_audit_changes ON public.sd_ticket_messages;
CREATE TRIGGER sd_ticket_messages_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.sd_ticket_messages
FOR EACH ROW EXECUTE FUNCTION private.sd_audit_ticket_message();