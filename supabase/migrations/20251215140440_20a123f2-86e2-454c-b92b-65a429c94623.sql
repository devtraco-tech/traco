-- =====================================================
-- FIX: Storage policies - restrict to admin/staff only
-- =====================================================

-- Drop overly permissive policies for course-photos
DROP POLICY IF EXISTS "Allow authenticated uploads to course-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to course-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from course-photos" ON storage.objects;

-- Drop overly permissive policies for teacher-photos
DROP POLICY IF EXISTS "Allow authenticated uploads to teacher-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to teacher-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from teacher-photos" ON storage.objects;

-- Create restricted policies for course-photos (admin/staff only)
CREATE POLICY "Admin and staff can upload course-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admin and staff can update course-photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admin and staff can delete course-photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Create restricted policies for teacher-photos (admin/staff only)
CREATE POLICY "Admin and staff can upload teacher-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'teacher-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admin and staff can update teacher-photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'teacher-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admin and staff can delete teacher-photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'teacher-photos' 
  AND public.is_admin_or_staff(auth.uid())
);