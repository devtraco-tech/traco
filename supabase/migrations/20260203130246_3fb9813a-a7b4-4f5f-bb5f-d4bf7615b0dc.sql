-- Add policy to allow admins and staff to insert patient leads
CREATE POLICY "Admins and staff can insert patient leads"
ON public.patient_leads
FOR INSERT
WITH CHECK (is_admin_or_staff(auth.uid()));