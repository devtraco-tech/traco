-- Fix the logic: suggested_start_date should be multiple dates, selection_dates should be single date
-- First, rename columns temporarily
ALTER TABLE courses RENAME COLUMN suggested_start_date TO suggested_start_date_old;
ALTER TABLE courses RENAME COLUMN selection_dates TO selection_dates_old;

-- Create new columns with correct types
ALTER TABLE courses ADD COLUMN suggested_start_date date[] NULL;
ALTER TABLE courses ADD COLUMN selection_date date NULL;

-- Migrate data from old columns
UPDATE courses SET suggested_start_date = ARRAY[suggested_start_date_old] WHERE suggested_start_date_old IS NOT NULL;
UPDATE courses SET selection_date = selection_dates_old[1] WHERE selection_dates_old IS NOT NULL AND array_length(selection_dates_old, 1) > 0;

-- Drop old columns
ALTER TABLE courses DROP COLUMN suggested_start_date_old;
ALTER TABLE courses DROP COLUMN selection_dates_old;