-- Create classifieds table
CREATE TABLE public.classifieds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  price NUMERIC,
  location TEXT,
  photo_1_url TEXT,
  photo_2_url TEXT,
  photo_3_url TEXT,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classifieds ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create classifieds
CREATE POLICY "Authenticated users can create classifieds"
ON public.classifieds
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can view their own classifieds
CREATE POLICY "Users can view own classifieds"
ON public.classifieds
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Policy: Users can update their own classifieds
CREATE POLICY "Users can update own classifieds"
ON public.classifieds
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policy: Admins can view all classifieds
CREATE POLICY "Admins can view all classifieds"
ON public.classifieds
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update all classifieds
CREATE POLICY "Admins can update all classifieds"
ON public.classifieds
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can delete classifieds
CREATE POLICY "Admins can delete classifieds"
ON public.classifieds
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: All authenticated users can view approved classifieds
CREATE POLICY "All can view approved classifieds"
ON public.classifieds
FOR SELECT
TO authenticated
USING (status = 'approved');

-- Policy: Anonymous can view approved classifieds
CREATE POLICY "Anonymous can view approved classifieds"
ON public.classifieds
FOR SELECT
TO anon
USING (status = 'approved' AND (expires_at IS NULL OR expires_at > now()));

-- Trigger to update updated_at
CREATE TRIGGER update_classifieds_updated_at
BEFORE UPDATE ON public.classifieds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();