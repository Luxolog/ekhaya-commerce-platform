alter table public.sd_customers add constraint sd_customers_id_org_key unique (id,organisation_id);
alter table public.sd_departments add constraint sd_departments_id_org_key unique (id,organisation_id);
alter table public.sd_tickets add constraint sd_tickets_id_org_key unique (id,organisation_id);
alter table public.sd_conversations add constraint sd_conversations_id_org_key unique (id,organisation_id);
alter table public.sd_channel_integrations add constraint sd_channel_integrations_id_org_key unique (id,organisation_id);

alter table public.sd_tickets drop constraint if exists sd_tickets_customer_id_fkey;
alter table public.sd_tickets drop constraint if exists sd_tickets_department_id_fkey;
alter table public.sd_tickets add constraint sd_tickets_customer_same_org_fkey
  foreign key (customer_id,organisation_id) references public.sd_customers(id,organisation_id);
alter table public.sd_tickets add constraint sd_tickets_department_same_org_fkey
  foreign key (department_id,organisation_id) references public.sd_departments(id,organisation_id);
alter table public.sd_tickets add constraint sd_tickets_assignee_is_member_fkey
  foreign key (organisation_id,assigned_to) references public.sd_organisation_members(organisation_id,user_id);

alter table public.sd_ticket_messages drop constraint if exists sd_ticket_messages_ticket_id_fkey;
alter table public.sd_ticket_messages drop constraint if exists sd_ticket_messages_author_customer_id_fkey;
alter table public.sd_ticket_messages add constraint sd_ticket_messages_ticket_same_org_fkey
  foreign key (ticket_id,organisation_id) references public.sd_tickets(id,organisation_id) on delete cascade;
alter table public.sd_ticket_messages add constraint sd_ticket_messages_customer_same_org_fkey
  foreign key (author_customer_id,organisation_id) references public.sd_customers(id,organisation_id);
alter table public.sd_ticket_messages add constraint sd_ticket_messages_author_is_member_fkey
  foreign key (organisation_id,author_user_id) references public.sd_organisation_members(organisation_id,user_id);

alter table public.sd_conversations drop constraint if exists sd_conversations_customer_id_fkey;
alter table public.sd_conversations add constraint sd_conversations_customer_same_org_fkey
  foreign key (customer_id,organisation_id) references public.sd_customers(id,organisation_id);
alter table public.sd_conversations add constraint sd_conversations_assignee_is_member_fkey
  foreign key (organisation_id,assigned_to) references public.sd_organisation_members(organisation_id,user_id);

alter table public.sd_conversation_messages drop constraint if exists sd_conversation_messages_conversation_id_fkey;
alter table public.sd_conversation_messages add constraint sd_conversation_messages_conversation_same_org_fkey
  foreign key (conversation_id,organisation_id) references public.sd_conversations(id,organisation_id) on delete cascade;
alter table public.sd_conversation_messages add constraint sd_conversation_messages_sender_is_member_fkey
  foreign key (organisation_id,sender_user_id) references public.sd_organisation_members(organisation_id,user_id);

alter table public.sd_whatsapp_usage_events drop constraint if exists sd_whatsapp_usage_events_integration_id_fkey;
alter table public.sd_whatsapp_usage_events add constraint sd_whatsapp_usage_same_org_integration_fkey
  foreign key (integration_id,organisation_id) references public.sd_channel_integrations(id,organisation_id);

alter table public.sd_audit_logs add constraint sd_audit_logs_actor_is_member_fkey
  foreign key (organisation_id,actor_user_id) references public.sd_organisation_members(organisation_id,user_id);
