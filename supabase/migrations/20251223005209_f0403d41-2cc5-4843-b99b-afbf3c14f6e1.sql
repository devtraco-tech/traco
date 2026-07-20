-- Fix linter WARN: Extension in Public
-- Move `unaccent` extension out of `public` schema to `extensions` schema

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Re-create compatibility wrappers in `public` so existing code keeps working
CREATE OR REPLACE FUNCTION public.unaccent(text)
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.unaccent($1);
$$;

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.unaccent($1, $2);
$$;