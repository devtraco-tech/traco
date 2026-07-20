-- Add course_unarchived trigger type to notification_groups and email_templates
-- Drop and recreate constraints to add the new trigger type

-- Drop the old constraints
alter table public.notification_groups drop constraint notification_groups_trigger_type_check;
alter table public.email_templates drop constraint email_templates_type_check;

-- Add new constraints with course_unarchived
alter table public.notification_groups add constraint notification_groups_trigger_type_check check (trigger_type in ('course_created', 'course_approved', 'course_rejected', 'course_pending_correction', 'course_unarchived', 'lead_confirmation'));

alter table public.email_templates add constraint email_templates_type_check check (type in ('course_created', 'course_approved', 'course_rejected', 'course_pending_correction', 'course_unarchived', 'lead_confirmation'));
