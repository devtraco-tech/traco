-- Update courses RLS: Only creator and admin can view courses in the dashboard
-- Public visibility removed - courses only visible to creator + admin (not staff)

BEGIN;

-- Drop existing courses policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'courses')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses', pol.policyname);
    END LOOP;
END $$;

-- New policy: Creator can view, edit, delete their own courses
CREATE POLICY "courses_creator_manage" ON public.courses FOR ALL TO authenticated
USING (auth.uid() = created_by);

-- New policy: Admin (only) can view, edit, delete all courses
CREATE POLICY "courses_admin_manage" ON public.courses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy for admin only to insert (create) courses
CREATE POLICY "courses_admin_create" ON public.courses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
