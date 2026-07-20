
-- ===== 1) patient-files bucket: make private & restrict =====
UPDATE storage.buckets SET public = false WHERE id = 'patient-files';

DROP POLICY IF EXISTS "Public can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view patient files" ON storage.objects;

CREATE POLICY "Triage staff view patient-files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-files' AND (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid())));

DROP POLICY IF EXISTS "Triage staff upload patient-files" ON storage.objects;
CREATE POLICY "Triage staff upload patient-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-files' AND (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid())));

DROP POLICY IF EXISTS "Triage staff update patient-files" ON storage.objects;
CREATE POLICY "Triage staff update patient-files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'patient-files' AND (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid())));

DROP POLICY IF EXISTS "Triage staff delete patient-files" ON storage.objects;
CREATE POLICY "Triage staff delete patient-files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'patient-files' AND (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid())));

-- ===== 2) classifieds: anon should not see contact_email/phone =====
-- Drop broad anon SELECT and create a SECURITY DEFINER function for public-safe view via RPC instead.
DROP POLICY IF EXISTS "Anonymous can view approved classifieds" ON public.classifieds;

-- Create a helper view-like function that returns approved classifieds without contact info for anon
CREATE OR REPLACE FUNCTION public.get_public_classifieds()
RETURNS TABLE (
  id uuid, title text, category text, description text,
  price numeric, location text,
  photo_1_url text, photo_2_url text, photo_3_url text,
  contact_name text, created_at timestamptz, expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, category, description, price, location,
         photo_1_url, photo_2_url, photo_3_url, contact_name, created_at, expires_at
  FROM public.classifieds
  WHERE status = 'approved' AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.get_public_classifieds() TO anon, authenticated;

-- Authenticated users keep contact info via existing "All can view approved classifieds" policy.

-- ===== 3) teachers: remove anon access; create safe public function =====
DROP POLICY IF EXISTS "Anonymous can view teachers" ON public.teachers;

CREATE OR REPLACE FUNCTION public.get_public_teachers()
RETURNS TABLE (
  id uuid, name text, bio text, photo_url text,
  specialties text[], cro text, is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, bio, photo_url, specialties, cro, is_active
  FROM public.teachers
  WHERE is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_teachers() TO anon, authenticated;

-- ===== 4) profiles: remove broad authenticated SELECT =====
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
-- Keep: own profile + admin/staff via existing policies

-- ===== 5) course-documents storage: restrict update/delete to admin/staff =====
DROP POLICY IF EXISTS "Allow authenticated delete from course-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to course-documents" ON storage.objects;

CREATE POLICY "Admin/staff delete course-documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-documents' AND public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin/staff update course-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-documents' AND public.is_admin_or_staff(auth.uid()));

-- ===== 6) teacher-photos storage: restrict update/delete to admin/staff =====
DROP POLICY IF EXISTS "Allow users to delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own photos" ON storage.objects;

CREATE POLICY "Admin/staff delete teacher-photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'teacher-photos' AND public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin/staff update teacher-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'teacher-photos' AND public.is_admin_or_staff(auth.uid()));

-- ===== 7) user_roles: restrict SELECT to own + admin =====
DROP POLICY IF EXISTS user_roles_read_all ON public.user_roles;

CREATE POLICY user_roles_read_own
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ===== 8) promotional_teams: restrict SELECT to admin/staff =====
DROP POLICY IF EXISTS "Authenticated users can view promotional teams" ON public.promotional_teams;

CREATE POLICY "Admin/staff view promotional teams"
ON public.promotional_teams FOR SELECT TO authenticated
USING (public.is_admin_or_staff(auth.uid()));

-- ===== 9) course-photos: remove anonymous upload =====
DROP POLICY IF EXISTS "Anonymous can upload to classifieds folder" ON storage.objects;
