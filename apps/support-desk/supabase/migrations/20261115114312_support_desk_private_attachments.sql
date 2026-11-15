insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'sd-attachments','sd-attachments',false,15728640,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

create policy sd_attachments_read_org on storage.objects
for select to authenticated using (
  bucket_id = 'sd-attachments'
  and private.sd_has_org_role(((storage.foldername(name))[1])::uuid)
);
create policy sd_attachments_upload_org on storage.objects
for insert to authenticated with check (
  bucket_id = 'sd-attachments'
  and private.sd_has_org_role(((storage.foldername(name))[1])::uuid)
);
create policy sd_attachments_update_org on storage.objects
for update to authenticated using (
  bucket_id = 'sd-attachments'
  and private.sd_has_org_role(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'sd-attachments'
  and private.sd_has_org_role(((storage.foldername(name))[1])::uuid)
);
create policy sd_attachments_delete_org on storage.objects
for delete to authenticated using (
  bucket_id = 'sd-attachments'
  and private.sd_has_org_role(((storage.foldername(name))[1])::uuid)
);
