-- Create Storage Bucket for Teacher Photos
insert into storage.buckets (id, name, public)
values ('teacher-photos', 'teacher-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own photos
drop policy if exists "Allow authenticated to upload teacher photos" on storage.objects;
create policy "Allow authenticated to upload teacher photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'teacher-photos' AND
  auth.role() = 'authenticated'
);

-- Allow anyone to view photos
drop policy if exists "Allow public to view teacher photos" on storage.objects;
create policy "Allow public to view teacher photos"
on storage.objects
for select
to public
using (bucket_id = 'teacher-photos');

-- Allow users to update their own photos
drop policy if exists "Allow users to update own photos" on storage.objects;
create policy "Allow users to update own photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'teacher-photos');

-- Allow users to delete their own photos
drop policy if exists "Allow users to delete own photos" on storage.objects;
create policy "Allow users to delete own photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'teacher-photos');
