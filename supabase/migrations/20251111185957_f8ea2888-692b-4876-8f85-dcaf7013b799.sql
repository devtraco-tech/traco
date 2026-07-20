-- Create storage buckets for course files and photos

-- Bucket for course photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-photos',
  'course-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Bucket for course documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-documents',
  'course-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Storage policies for course photos (public bucket)
CREATE POLICY "Anyone can view course photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-photos');

CREATE POLICY "Admins and staff can upload course photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admins and staff can update course photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admins and staff can delete course photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Storage policies for course documents (private bucket)
CREATE POLICY "Authenticated users can view course documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins and staff can upload course documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-documents'
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admins and staff can update course documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-documents'
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Admins and staff can delete course documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-documents'
  AND public.is_admin_or_staff(auth.uid())
);