-- Migration: Link Clinic Classes to Specialties
-- Description: Adds a specialty_id column to the clinic_classes table to allow linking classes to specific medical/dental specialties.

ALTER TABLE clinic_classes 
ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES patient_specialties(id) ON DELETE SET NULL;

-- Optional: Create an index for performance
CREATE INDEX IF NOT EXISTS idx_clinic_classes_specialty_id ON clinic_classes(specialty_id);
