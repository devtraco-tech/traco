-- Migration: Triage Relational Configuration Tables
-- Creates tables for dynamic Specialties, Procedures, Clinics, and Classes.

-- 1. Clinics Table
CREATE TABLE public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Clinic Classes (Turmas) Table
CREATE TABLE public.clinic_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'closed', 'upcoming'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Patient Specialties Table (E.g. Endodontia, Ortodontia)
CREATE TABLE public.patient_specialties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Patient Procedures Table (E.g. Extração, Raspagem attached to a Specialty)
CREATE TABLE public.patient_procedures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    specialty_id UUID NOT NULL REFERENCES public.patient_specialties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Row Level Security
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_procedures ENABLE ROW LEVEL SECURITY;

-- Anonymous / Authenticated Read Access for Config Tables (Assuming public readability for dropdowns)
CREATE POLICY "Enable read access for all users" ON public.clinics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.clinic_classes FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.patient_specialties FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.patient_procedures FOR SELECT USING (true);

-- Authenticated Write Access
CREATE POLICY "Enable insert for authenticated users only" ON public.clinics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.clinics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.clinics FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.clinic_classes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.clinic_classes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.clinic_classes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.patient_specialties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.patient_specialties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.patient_specialties FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.patient_procedures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.patient_procedures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.patient_procedures FOR DELETE TO authenticated USING (true);

-- Insert Some Initial Mock Data to bootstrap the system smoothly:
INSERT INTO public.patient_specialties (id, name, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Endodontia', 'Tratamentos de canal e raiz'),
('22222222-2222-2222-2222-222222222222', 'Implantodontia', 'Implantes dentários'),
('33333333-3333-3333-3333-333333333333', 'Ortodontia', 'Aparelhos e alinhamento');

INSERT INTO public.patient_procedures (specialty_id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Tratamento de Canal Simples'),
('11111111-1111-1111-1111-111111111111', 'Retratamento de Canal'),
('22222222-2222-2222-2222-222222222222', 'Implante Unitário'),
('22222222-2222-2222-2222-222222222222', 'Protocolo Superior'),
('33333333-3333-3333-3333-333333333333', 'Manutenção Metálico'),
('33333333-3333-3333-3333-333333333333', 'Alinhador Invisível Inicial');

INSERT INTO public.clinics (id, name, city, state) VALUES 
('44444444-4444-4444-4444-444444444444', 'ABO Matriz Sul', 'Goiânia', 'GO'),
('55555555-5555-5555-5555-555555555555', 'ABO Taguatinga', 'Brasília', 'DF');

INSERT INTO public.clinic_classes (clinic_id, name, status) VALUES 
('44444444-4444-4444-4444-444444444444', 'Turma Implante 24.1', 'open'),
('44444444-4444-4444-4444-444444444444', 'Turma Ortodontia 24.2', 'open'),
('55555555-5555-5555-5555-555555555555', 'Turma Endodontia Intensivo', 'upcoming');
