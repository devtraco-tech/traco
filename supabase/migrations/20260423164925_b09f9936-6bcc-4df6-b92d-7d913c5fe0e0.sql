CREATE POLICY "Public can view approved courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (status IN ('approved'::course_status, 'in_progress'::course_status));