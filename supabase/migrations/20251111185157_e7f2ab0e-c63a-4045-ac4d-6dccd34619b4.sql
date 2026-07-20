-- =====================================================
-- MIGRATION: Complete LMS Database Structure
-- Description: Creates all tables, functions, triggers and RLS policies
-- =====================================================

-- =====================================================
-- 1. CREATE ENUM TYPES
-- =====================================================

-- Application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'student');

-- Course status lifecycle
CREATE TYPE public.course_status AS ENUM (
  'draft',
  'pending_approval', 
  'approved',
  'in_progress',
  'completed',
  'cancelled'
);

-- Supported languages
CREATE TYPE public.language AS ENUM ('portuguese', 'english', 'spanish');

-- Validation workflow status
CREATE TYPE public.validation_status AS ENUM (
  'pending_review',
  'approved',
  'pending_correction',
  'rejected'
);

-- Course delivery modality
CREATE TYPE public.course_modality AS ENUM ('presencial', 'online', 'hibrido');

-- Target audience categories
CREATE TYPE public.target_audience AS ENUM (
  'cirurgioes_dentistas',
  'tecnicos',
  'auxiliares',
  'estudantes',
  'outros'
);

-- =====================================================
-- 2. CREATE SUPPORT TABLES
-- =====================================================

-- Departments (Projetos, Acadêmico, etc)
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_departments_name ON public.departments(name);

-- Billing companies for course payments
CREATE TABLE public.billing_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teachers/Professors
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  bio TEXT,
  specialties TEXT[],
  photo_url TEXT,
  cro TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teachers_email ON public.teachers(email);
CREATE INDEX idx_teachers_is_active ON public.teachers(is_active);

-- =====================================================
-- 3. CREATE USER PROFILES TABLE
-- =====================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  cpf TEXT UNIQUE,
  cro TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_department ON public.profiles(department_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_cpf ON public.profiles(cpf);

-- =====================================================
-- 4. CREATE USER ROLES TABLE (SEPARATE FOR SECURITY)
-- =====================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- =====================================================
-- 5. CREATE COURSES TABLES
-- =====================================================

-- Main courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  title TEXT NOT NULL,
  area TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  language language DEFAULT 'portuguese',
  
  -- Details
  modality course_modality NOT NULL,
  target_audience target_audience NOT NULL,
  vacancies INTEGER NOT NULL CHECK (vacancies > 0),
  workload INTEGER NOT NULL CHECK (workload > 0),
  investment DECIMAL(10,2) NOT NULL CHECK (investment >= 0),
  prerequisites TEXT,
  
  -- Dates
  suggested_start_date DATE,
  effective_start_date DATE,
  end_date DATE,
  
  -- Descriptions
  description TEXT NOT NULL,
  differentials TEXT,
  program TEXT,
  periodicity TEXT,
  duration TEXT,
  
  -- Files
  schedule_file_url TEXT,
  materials_file_url TEXT,
  project_file_url TEXT,
  
  -- 4 mandatory photos
  photo_1_url TEXT NOT NULL,
  photo_2_url TEXT NOT NULL,
  photo_3_url TEXT NOT NULL,
  photo_4_url TEXT NOT NULL,
  
  -- Competitors
  competitors TEXT,
  
  -- Observations
  observations TEXT,
  
  -- Status and billing
  status course_status DEFAULT 'draft',
  billing_company_id UUID REFERENCES public.billing_companies(id) ON DELETE SET NULL,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_teacher ON public.courses(teacher_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_area ON public.courses(area);
CREATE INDEX idx_courses_start_date ON public.courses(effective_start_date);
CREATE INDEX idx_courses_created_by ON public.courses(created_by);

-- Course registrations/enrollments
CREATE TABLE public.course_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active',
  completion_date TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(course_id, user_id)
);

CREATE INDEX idx_registrations_course ON public.course_registrations(course_id);
CREATE INDEX idx_registrations_user ON public.course_registrations(user_id);
CREATE INDEX idx_registrations_status ON public.course_registrations(status);

-- =====================================================
-- 6. CREATE VALIDATION SYSTEM TABLES
-- =====================================================

-- Course validations submitted by students
CREATE TABLE public.course_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  registration_id UUID REFERENCES public.course_registrations(id) ON DELETE CASCADE,
  
  -- Department responsible for validation
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL NOT NULL,
  
  -- Submission data
  status validation_status DEFAULT 'pending_review',
  submission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  submission_file_url TEXT,
  submission_notes TEXT,
  
  -- Review data
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validations_course ON public.course_validations(course_id);
CREATE INDEX idx_validations_user ON public.course_validations(user_id);
CREATE INDEX idx_validations_status ON public.course_validations(status);
CREATE INDEX idx_validations_department ON public.course_validations(department_id);
CREATE INDEX idx_validations_reviewed_by ON public.course_validations(reviewed_by);

-- Validation history for audit trail
CREATE TABLE public.course_validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID REFERENCES public.course_validations(id) ON DELETE CASCADE NOT NULL,
  
  -- Status change
  previous_status validation_status,
  new_status validation_status NOT NULL,
  
  -- Who made the change
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Comments
  comments TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validation_history_validation ON public.course_validation_history(validation_id);
CREATE INDEX idx_validation_history_date ON public.course_validation_history(change_date);

-- =====================================================
-- 7. CREATE SITE CONFIGURATION TABLE
-- =====================================================

CREATE TABLE public.site_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- 8. CREATE SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- Function to check if user is enrolled in a course
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_registrations
    WHERE user_id = _user_id
      AND course_id = _course_id
      AND status = 'active'
  )
$$;

-- =====================================================
-- 9. CREATE TRIGGERS
-- =====================================================

-- Trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_validations_updated_at
  BEFORE UPDATE ON public.course_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_companies_updated_at
  BEFORE UPDATE ON public.billing_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to track validation status changes
CREATE OR REPLACE FUNCTION public.track_validation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.course_validation_history (
      validation_id,
      previous_status,
      new_status,
      changed_by,
      comments
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.reviewed_by,
      NEW.review_notes
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_validation_status_change
  AFTER UPDATE ON public.course_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.track_validation_status_change();

-- =====================================================
-- 10. ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DEPARTMENTS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TEACHERS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view teachers"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and staff can manage teachers"
  ON public.teachers FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- COURSES
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approved courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    status IN ('approved', 'in_progress', 'completed')
    OR public.is_admin_or_staff(auth.uid())
  );

CREATE POLICY "Admins and staff can manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- COURSE REGISTRATIONS
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations"
  ON public.course_registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins and staff can manage registrations"
  ON public.course_registrations FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- COURSE VALIDATIONS
ALTER TABLE public.course_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own validations"
  ON public.course_validations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin_or_staff(auth.uid())
  );

CREATE POLICY "Students can create validations for enrolled courses"
  ON public.course_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_enrolled_in_course(auth.uid(), course_id)
  );

CREATE POLICY "Admins and staff can update validations"
  ON public.course_validations FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- COURSE VALIDATION HISTORY
ALTER TABLE public.course_validation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own validation history"
  ON public.course_validation_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_validations cv
      WHERE cv.id = validation_id
      AND (cv.user_id = auth.uid() OR public.is_admin_or_staff(auth.uid()))
    )
  );

-- BILLING COMPANIES
ALTER TABLE public.billing_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and staff can view billing companies"
  ON public.billing_companies FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can manage billing companies"
  ON public.billing_companies FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SITE CONFIGURATION
ALTER TABLE public.site_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view configuration"
  ON public.site_configuration FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update configuration"
  ON public.site_configuration FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 11. INSERT INITIAL DATA (SEEDS)
-- =====================================================

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Projetos', 'Departamento responsável por projetos e iniciativas'),
  ('Acadêmico', 'Departamento de gestão acadêmica e pedagógica'),
  ('Administrativo', 'Departamento administrativo e financeiro'),
  ('TI', 'Departamento de Tecnologia da Informação');

-- Insert site configuration defaults
INSERT INTO public.site_configuration (key, value, description) VALUES
  ('site_name', 'ABO Goiás', 'Nome do site'),
  ('site_logo_url', '', 'URL do logo'),
  ('contact_email', 'contato@abogoias.org.br', 'Email de contato'),
  ('contact_phone', '', 'Telefone de contato'),
  ('address', '', 'Endereço');