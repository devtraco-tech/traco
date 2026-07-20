-- Allow anonymous uploads to the classifieds folder in course-photos bucket
CREATE POLICY "Anonymous can upload to classifieds folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'course-photos' 
  AND (storage.foldername(name))[1] = 'classifieds'
);

-- Allow public read access to all files in course-photos bucket (already public bucket, but ensure policy)
CREATE POLICY "Anyone can view course-photos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'course-photos');

-- Allow authenticated users to upload anywhere in course-photos
CREATE POLICY "Authenticated users can upload to course-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-photos');