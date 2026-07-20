-- Add selection_dates field to courses table
ALTER TABLE courses ADD COLUMN selection_dates date[] NULL;