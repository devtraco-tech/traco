-- Create classified_logs table for tracking classified approval/rejection history
CREATE TABLE public.classified_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classified_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classified_logs ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_classified_logs_classified_id ON public.classified_logs(classified_id);

-- RLS Policies
CREATE POLICY "Admins can view all classified logs"
ON public.classified_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert classified logs"
ON public.classified_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));