-- Storage Bucket: invoices
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false) on conflict (id) do nothing;
-- RLS Object Policies
create policy "Users can upload own invoices" on storage.objects for
insert with check (
        bucket_id = 'invoices'
        and auth.uid() = owner
    );
create policy "Users can view own invoices" on storage.objects for
select using (
        bucket_id = 'invoices'
        and auth.uid() = owner
    );