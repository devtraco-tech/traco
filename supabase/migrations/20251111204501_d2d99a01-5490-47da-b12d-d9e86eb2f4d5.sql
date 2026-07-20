-- Make photos 2, 3, and 4 nullable (only photo 1 is required)
ALTER TABLE public.courses 
  ALTER COLUMN photo_2_url DROP NOT NULL,
  ALTER COLUMN photo_3_url DROP NOT NULL,
  ALTER COLUMN photo_4_url DROP NOT NULL;