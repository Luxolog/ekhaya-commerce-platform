revoke usage,select on all sequences in schema public from authenticated;
grant usage,select on sequence public.sd_audit_logs_id_seq,public.sd_tickets_ticket_number_seq to authenticated;
