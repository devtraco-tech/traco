-- Create email_templates table
create table if not exists public.email_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('course_created', 'course_approved', 'course_rejected', 'course_pending_correction', 'course_unarchived', 'lead_confirmation')),
  subject text not null,
  html_template text not null,
  text_template text,
  variables text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notification_groups table
create table if not exists public.notification_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in ('course_created', 'course_approved', 'course_rejected', 'course_pending_correction', 'course_unarchived', 'lead_confirmation')),
  emails text[] not null default array[]::text[],
  template_id uuid not null references public.email_templates(id) on delete cascade,
  is_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index if not exists email_templates_type_idx on public.email_templates(type);
create index if not exists notification_groups_trigger_type_idx on public.notification_groups(trigger_type);
create index if not exists notification_groups_is_enabled_idx on public.notification_groups(is_enabled);

-- Enable RLS
alter table public.email_templates enable row level security;
alter table public.notification_groups enable row level security;

-- Create RLS policies (only admins can manage)
create policy "Allow admins to view email templates"
  on public.email_templates
  for select
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to insert email templates"
  on public.email_templates
  for insert
  with check (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to update email templates"
  on public.email_templates
  for update
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to delete email templates"
  on public.email_templates
  for delete
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to view notification groups"
  on public.notification_groups
  for select
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to insert notification groups"
  on public.notification_groups
  for insert
  with check (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to update notification groups"
  on public.notification_groups
  for update
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));

create policy "Allow admins to delete notification groups"
  on public.notification_groups
  for delete
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ));
