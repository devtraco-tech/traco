DROP POLICY IF EXISTS "Public read patient-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload patient-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete patient-files" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated read access to course-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to course-documents" ON storage.objects;

CREATE POLICY "Admin/staff read course-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-documents' AND public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin/staff upload course-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-documents' AND public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, text);