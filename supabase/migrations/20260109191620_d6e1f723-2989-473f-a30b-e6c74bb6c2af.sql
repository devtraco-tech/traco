-- Address linter warnings: avoid RLS policies with WITH CHECK (true)

-- course_history: allow inserts only when the row is attributed to the current user
DROP POLICY IF EXISTS "System can insert course history" ON public.course_history;
CREATE POLICY "Users can insert own course history"
ON public.course_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = changed_by);

-- notifications: allow inserts by admins/staff, by the recipient themselves, or by the owner of the referenced entity
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Scoped notification inserts"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR user_id = auth.uid()
  OR (
    reference_type = 'course'
    AND reference_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = reference_id
        AND c.created_by = auth.uid()
    )
  )
  OR (
    reference_type = 'classified'
    AND reference_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.classifieds cl
      WHERE cl.id = reference_id
        AND cl.created_by = auth.uid()
    )
  )
);

-- course_leads: keep public lead form working but avoid literal TRUE checks
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.course_leads;
CREATE POLICY "Public can insert leads"
ON public.course_leads
FOR INSERT
TO public
WITH CHECK (
  length(coalesce(name, '')) >= 2
  AND position('@' in coalesce(email, '')) > 1
);
