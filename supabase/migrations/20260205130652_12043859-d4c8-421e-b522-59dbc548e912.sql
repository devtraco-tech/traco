-- Create old_contacts table to store legacy contacts with original columns
CREATE TABLE public.old_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  celular TEXT NOT NULL,
  creation_date TIMESTAMP WITH TIME ZONE,
  modified_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.old_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for admin/staff access
CREATE POLICY "Admin and staff can view old contacts"
  ON public.old_contacts
  FOR SELECT
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin and staff can insert old contacts"
  ON public.old_contacts
  FOR INSERT
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin and staff can update old contacts"
  ON public.old_contacts
  FOR UPDATE
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin and staff can delete old contacts"
  ON public.old_contacts
  FOR DELETE
  USING (public.is_admin_or_staff(auth.uid()));