-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_course_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate slug if it's null/empty
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    IF TG_OP = 'UPDATE' AND OLD.title = NEW.title THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.slug != OLD.slug THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Generate base slug from title
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        unaccent(COALESCE(NEW.title, 'curso')),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
  
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (
    SELECT 1 FROM public.courses 
    WHERE slug = final_slug 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_generate_course_slug ON public.courses;
CREATE TRIGGER trigger_generate_course_slug
BEFORE INSERT OR UPDATE OF title ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.generate_course_slug();