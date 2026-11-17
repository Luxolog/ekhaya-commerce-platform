-- Reconstructed from the live pg_policies catalog on 2026-11-16.
-- This migration was already applied to the production Supabase project.
-- Conditional creation keeps this recovery copy safe if base policies exist.
DO $migration$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('sd_audit_logs','sd_audit_logs_insert_operational', $p$CREATE POLICY sd_audit_logs_insert_operational ON public.sd_audit_logs FOR INSERT TO authenticated WITH CHECK (actor_user_id = (SELECT auth.uid()) AND private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]))$p$),
      ('sd_audit_logs','sd_audit_logs_read_admin', $p$CREATE POLICY sd_audit_logs_read_admin ON public.sd_audit_logs FOR SELECT TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_channel_integrations','sd_integrations_admin_access', $p$CREATE POLICY sd_integrations_admin_access ON public.sd_channel_integrations FOR ALL TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_customers','sd_customers_delete', $p$CREATE POLICY sd_customers_delete ON public.sd_customers FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_customers','sd_customers_insert', $p$CREATE POLICY sd_customers_insert ON public.sd_customers FOR INSERT TO authenticated WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]))$p$),
      ('sd_customers','sd_customers_read', $p$CREATE POLICY sd_customers_read ON public.sd_customers FOR SELECT TO authenticated USING (private.sd_has_org_role(organisation_id))$p$),
      ('sd_customers','sd_customers_update', $p$CREATE POLICY sd_customers_update ON public.sd_customers FOR UPDATE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]))$p$),
      ('sd_departments','sd_departments_delete', $p$CREATE POLICY sd_departments_delete ON public.sd_departments FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_departments','sd_departments_insert', $p$CREATE POLICY sd_departments_insert ON public.sd_departments FOR INSERT TO authenticated WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[]))$p$),
      ('sd_departments','sd_departments_read', $p$CREATE POLICY sd_departments_read ON public.sd_departments FOR SELECT TO authenticated USING (private.sd_has_org_role(organisation_id))$p$),
      ('sd_departments','sd_departments_update', $p$CREATE POLICY sd_departments_update ON public.sd_departments FOR UPDATE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor']::text[]))$p$),
      ('sd_organisations','sd_organisations_insert_platform', $p$CREATE POLICY sd_organisations_insert_platform ON public.sd_organisations FOR INSERT TO authenticated WITH CHECK (private.sd_is_platform_admin())$p$),
      ('sd_organisations','sd_organisations_read_member', $p$CREATE POLICY sd_organisations_read_member ON public.sd_organisations FOR SELECT TO authenticated USING (private.sd_has_org_role(id))$p$),
      ('sd_organisations','sd_organisations_update_admin', $p$CREATE POLICY sd_organisations_update_admin ON public.sd_organisations FOR UPDATE TO authenticated USING (private.sd_has_org_role(id, ARRAY['owner','admin']::text[])) WITH CHECK (private.sd_has_org_role(id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_platform_admins','sd_platform_admins_read_self', $p$CREATE POLICY sd_platform_admins_read_self ON public.sd_platform_admins FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))$p$),
      ('sd_whatsapp_usage_events','sd_whatsapp_usage_admin_access', $p$CREATE POLICY sd_whatsapp_usage_admin_access ON public.sd_whatsapp_usage_events FOR ALL TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_tickets','sd_tickets_delete', $p$CREATE POLICY sd_tickets_delete ON public.sd_tickets FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_tickets','sd_tickets_insert', $p$CREATE POLICY sd_tickets_insert ON public.sd_tickets FOR INSERT TO authenticated WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin','supervisor','agent']::text[]))$p$),
      ('sd_tickets','sd_tickets_read', $p$CREATE POLICY sd_tickets_read ON public.sd_tickets FOR SELECT TO authenticated USING (private.sd_is_platform_admin() OR (private.sd_has_org_role(organisation_id) AND (EXISTS (SELECT 1 FROM public.sd_organisation_members m WHERE m.organisation_id = sd_tickets.organisation_id AND m.user_id = (SELECT auth.uid()) AND m.status = 'active' AND m.role IN ('owner','admin','supervisor','viewer')) OR assigned_to = (SELECT auth.uid())))$p$),
      ('sd_tickets','sd_tickets_update', $p$CREATE POLICY sd_tickets_update ON public.sd_tickets FOR UPDATE TO authenticated USING (private.sd_can_manage_ticket(organisation_id,id)) WITH CHECK (private.sd_can_manage_ticket(organisation_id,id))$p$)
    ) AS policies(tablename, policyname, ddl)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=p.tablename AND policyname=p.policyname) THEN
      EXECUTE p.ddl;
    END IF;
  END LOOP;
END
$migration$;