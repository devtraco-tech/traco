-- Create Storage Bucket for Teacher Photos
-- Execute this in Supabase SQL Editor

-- Create bucket
insert into storage.buckets (id, name, public)
values ('teacher-photos', 'teacher-photos', true)
on conflict (id) do nothing;

-- Enable RLS on bucket
alter table storage.objects enable row level security;

-- Allow authenticated users to upload their own photos
create policy "Allow authenticated to upload teacher photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'teacher-photos' AND
  auth.role() = 'authenticated'
);

-- Allow anyone to view photos
create policy "Allow public to view teacher photos"
on storage.objects
for select
to public
using (bucket_id = 'teacher-photos');

-- Allow users to update their own photos
create policy "Allow users to update own photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'teacher-photos');

-- Allow users to delete their own photos
create policy "Allow users to delete own photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'teacher-photos');
