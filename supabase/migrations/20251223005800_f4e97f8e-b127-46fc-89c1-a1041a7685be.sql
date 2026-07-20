-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, course, classified, validation
  reference_id UUID, -- ID do curso, classificado, etc
  reference_type TEXT, -- 'course', 'classified', 'validation'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (for triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Function to notify admins and staff when a new course is created
CREATE OR REPLACE FUNCTION public.notify_new_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Notify all admins and staff
  FOR admin_user IN 
    SELECT DISTINCT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role IN ('admin', 'staff')
  LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      admin_user.user_id,
      'Novo curso cadastrado',
      'O curso "' || NEW.title || '" foi cadastrado e aguarda validação.',
      'course',
      NEW.id,
      'course'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for new courses
CREATE TRIGGER trigger_notify_new_course
AFTER INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_course();

-- Function to notify admins when a new classified is created
CREATE OR REPLACE FUNCTION public.notify_new_classified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Only notify if status is pending
  IF NEW.status = 'pending_approval' THEN
    FOR admin_user IN 
      SELECT DISTINCT ur.user_id 
      FROM user_roles ur 
      WHERE ur.role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        admin_user.user_id,
        'Novo classificado para aprovar',
        'O classificado "' || NEW.title || '" aguarda aprovação.',
        'classified',
        NEW.id,
        'classified'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new classifieds
CREATE TRIGGER trigger_notify_new_classified
AFTER INSERT ON public.classifieds
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_classified();

-- Function to notify course creator when validation status changes
CREATE OR REPLACE FUNCTION public.notify_validation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_record RECORD;
  status_label TEXT;
BEGIN
  -- Only notify on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get course info
    SELECT id, title, created_by INTO course_record 
    FROM courses 
    WHERE id = NEW.course_id;
    
    -- Set status label
    CASE NEW.status
      WHEN 'approved' THEN status_label := 'aprovada';
      WHEN 'rejected' THEN status_label := 'rejeitada';
      WHEN 'pending_correction' THEN status_label := 'requer correções';
      ELSE status_label := NEW.status::text;
    END CASE;
    
    -- Notify course creator
    IF course_record.created_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        course_record.created_by,
        'Validação atualizada',
        'A validação do curso "' || course_record.title || '" foi ' || status_label || '.',
        'validation',
        NEW.course_id,
        'course'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for validation changes
CREATE TRIGGER trigger_notify_validation_change
AFTER UPDATE ON public.course_validations
FOR EACH ROW
EXECUTE FUNCTION public.notify_validation_change();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;