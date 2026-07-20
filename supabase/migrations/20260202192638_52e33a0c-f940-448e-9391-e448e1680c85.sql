-- Create patient_leads table
CREATE TABLE public.patient_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile_phone TEXT NOT NULL,
  landline_phone TEXT,
  gender TEXT NOT NULL,
  birth_date DATE NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_notification_emails table for configurable email recipients
CREATE TABLE public.patient_notification_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notification_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for patient_leads
CREATE POLICY "Admins and staff can view all patient leads"
ON public.patient_leads FOR SELECT
USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins and staff can update patient leads"
ON public.patient_leads FOR UPDATE
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can delete patient leads"
ON public.patient_leads FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can insert patient leads"
ON public.patient_leads FOR INSERT
WITH CHECK (
  length(COALESCE(full_name, '')) >= 2 AND
  length(COALESCE(mobile_phone, '')) >= 10
);

-- RLS policies for patient_notification_emails
CREATE POLICY "Admins can manage notification emails"
ON public.patient_notification_emails FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and staff can view notification emails"
ON public.patient_notification_emails FOR SELECT
USING (is_admin_or_staff(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_patient_leads_updated_at
BEFORE UPDATE ON public.patient_leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_notification_emails_updated_at
BEFORE UPDATE ON public.patient_notification_emails
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();