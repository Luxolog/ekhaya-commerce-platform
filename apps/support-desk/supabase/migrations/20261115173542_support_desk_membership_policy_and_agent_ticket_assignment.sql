-- Reconstructed from the live catalog on 2026-11-16.
DO $migration$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('sd_organisation_members','sd_members_delete_org', $p$CREATE POLICY sd_members_delete_org ON public.sd_organisation_members FOR DELETE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_organisation_members','sd_members_insert_org', $p$CREATE POLICY sd_members_insert_org ON public.sd_organisation_members FOR INSERT TO authenticated WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$),
      ('sd_organisation_members','sd_members_read_org', $p$CREATE POLICY sd_members_read_org ON public.sd_organisation_members FOR SELECT TO authenticated USING (private.sd_has_org_role(organisation_id))$p$),
      ('sd_organisation_members','sd_members_update_org', $p$CREATE POLICY sd_members_update_org ON public.sd_organisation_members FOR UPDATE TO authenticated USING (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[])) WITH CHECK (private.sd_has_org_role(organisation_id, ARRAY['owner','admin']::text[]))$p$)
    ) AS policies(tablename, policyname, ddl)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=p.tablename AND policyname=p.policyname) THEN
      EXECUTE p.ddl;
    END IF;
  END LOOP;
END
$migration$;

CREATE OR REPLACE FUNCTION private.sd_assign_new_ticket_to_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.sd_organisation_members m
       WHERE m.organisation_id = NEW.organisation_id
         AND m.user_id = (SELECT auth.uid())
         AND m.status = 'active' AND m.role = 'agent'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.sd_organisation_members m
       WHERE m.organisation_id = NEW.organisation_id
         AND m.user_id = (SELECT auth.uid())
         AND m.status = 'active' AND m.role IN ('owner','admin','supervisor')
     )
  THEN NEW.assigned_to := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sd_tickets_assign_creator_agent ON public.sd_tickets;
CREATE TRIGGER sd_tickets_assign_creator_agent
BEFORE INSERT ON public.sd_tickets
FOR EACH ROW EXECUTE FUNCTION private.sd_assign_new_ticket_to_agent();