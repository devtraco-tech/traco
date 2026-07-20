-- Create table for course leads from WordPress
CREATE TABLE public.course_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  notes TEXT,
  source TEXT DEFAULT 'wordpress',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.course_leads ENABLE ROW LEVEL SECURITY;

-- Allow public to insert leads (from WordPress)
CREATE POLICY "Anyone can insert leads"
ON public.course_leads
FOR INSERT
WITH CHECK (true);

-- Admins and staff can view all leads
CREATE POLICY "Admins and staff can view leads"
ON public.course_leads
FOR SELECT
USING (is_admin_or_staff(auth.uid()));

-- Admins and staff can update leads
CREATE POLICY "Admins and staff can update leads"
ON public.course_leads
FOR UPDATE
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_course_leads_updated_at
BEFORE UPDATE ON public.course_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_course_leads_course_id ON public.course_leads(course_id);
CREATE INDEX idx_course_leads_email ON public.course_leads(email);
CREATE INDEX idx_course_leads_status ON public.course_leads(status);