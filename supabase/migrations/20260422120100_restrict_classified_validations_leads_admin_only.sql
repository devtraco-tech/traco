-- Update RLS policies: Admin-only access for classifieds, validations, and leads
-- Remove public visibility and staff access - only admin can manage these

BEGIN;

-- ============================================================================
-- 1. CLASSIFIEDS: Remove public visibility, keep creator + admin only
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'classifieds')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.classifieds', pol.policyname);
    END LOOP;
END $$;

-- Creator can view, edit, delete own classifieds
CREATE POLICY "classifieds_creator_manage" ON public.classifieds FOR ALL TO authenticated
USING (auth.uid() = created_by);

-- Admin can view, edit, delete all classifieds
CREATE POLICY "classifieds_admin_manage" ON public.classifieds FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can insert classifieds
CREATE POLICY "classifieds_admin_create" ON public.classifieds FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 2. COURSE_VALIDATIONS: Admin only (remove coordenador access)
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'course_validations')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_validations', pol.policyname);
    END LOOP;
END $$;

-- Admin can insert, update, delete all validations
CREATE POLICY "course_validations_admin_manage" ON public.course_validations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 3. COURSE_LEADS: Admin only (remove staff access)
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'course_leads')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_leads', pol.policyname);
    END LOOP;
END $$;

-- Public can insert leads (signup form)
CREATE POLICY "course_leads_public_insert" ON public.course_leads FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Admin can view all leads
CREATE POLICY "course_leads_admin_view" ON public.course_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update leads
CREATE POLICY "course_leads_admin_update" ON public.course_leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete leads
CREATE POLICY "course_leads_admin_delete" ON public.course_leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 4. PATIENT_LEADS: Admin only (remove staff access)
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'patient_leads')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.patient_leads', pol.policyname);
    END LOOP;
END $$;

-- Public can insert patient leads (triage form)
CREATE POLICY "patient_leads_public_insert" ON public.patient_leads FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Admin can view all patient leads
CREATE POLICY "patient_leads_admin_view" ON public.patient_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update patient leads
CREATE POLICY "patient_leads_admin_update" ON public.patient_leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete patient leads
CREATE POLICY "patient_leads_admin_delete" ON public.patient_leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
