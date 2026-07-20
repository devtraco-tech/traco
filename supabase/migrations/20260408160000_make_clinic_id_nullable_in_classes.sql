-- Migration: Make clinic_id nullable in clinic_classes
-- Description: Allows classes (turmas) to be created without being strictly tied to a single clinic initially.

ALTER TABLE public.clinic_classes ALTER COLUMN clinic_id DROP NOT NULL;
