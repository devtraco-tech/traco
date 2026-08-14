-- Create classified approval logs table
CREATE TABLE IF NOT EXISTS public.classified_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'updated')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  timezone TEXT DEFAULT 'America/Sao_Paulo'
);

-- The table may already exist from the immediately preceding generated
-- migration. Add the stricter action validation without recreating data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.classified_logs'::regclass
      AND conname = 'classified_logs_action_check'
  ) THEN
    ALTER TABLE public.classified_logs
      ADD CONSTRAINT classified_logs_action_check
      CHECK (action IN ('created', 'approved', 'rejected', 'updated'));
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.classified_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view logs for their own classifieds
CREATE POLICY "Users can view logs for own classifieds"
ON public.classified_logs
FOR SELECT
TO authenticated
USING (
  classified_id IN (
    SELECT id FROM public.classifieds WHERE created_by = auth.uid()
  )
);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.classified_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: System and admins can insert logs
CREATE POLICY "System can insert logs"
ON public.classified_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_classified_logs_classified_id
  ON public.classified_logs(classified_id);
CREATE INDEX IF NOT EXISTS idx_classified_logs_created_at
  ON public.classified_logs(created_at DESC);

-- Function to automatically log classified creation
CREATE OR REPLACE FUNCTION log_classified_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.classified_logs (classified_id, action, performed_by, created_at)
  VALUES (NEW.id, 'created', NEW.created_by, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for classified creation
DROP TRIGGER IF EXISTS trigger_log_classified_creation ON public.classifieds;
CREATE TRIGGER trigger_log_classified_creation
AFTER INSERT ON public.classifieds
FOR EACH ROW
EXECUTE FUNCTION log_classified_creation();
