-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to course-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to course-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read access to course-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from course-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from course-documents" ON storage.objects;

-- Course Photos bucket policies (public read, authenticated write/delete)
CREATE POLICY "Allow authenticated uploads to course-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-photos');

CREATE POLICY "Allow public read access to course-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-photos');

CREATE POLICY "Allow authenticated delete from course-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-photos');

CREATE POLICY "Allow authenticated update to course-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-photos')
WITH CHECK (bucket_id = 'course-photos');

-- Course Documents bucket policies (authenticated only)
CREATE POLICY "Allow authenticated uploads to course-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-documents');

CREATE POLICY "Allow authenticated read access to course-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'course-documents');

CREATE POLICY "Allow authenticated delete from course-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-documents');

CREATE POLICY "Allow authenticated update to course-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-documents')
WITH CHECK (bucket_id = 'course-documents');