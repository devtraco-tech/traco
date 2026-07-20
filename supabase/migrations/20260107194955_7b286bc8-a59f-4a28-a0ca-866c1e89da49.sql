-- Remove old check constraint and add new one with course_unarchived type
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;

ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_type_check 
CHECK (type IN ('course_created', 'course_approved', 'course_rejected', 'course_pending_correction', 'lead_confirmation', 'course_unarchived'));