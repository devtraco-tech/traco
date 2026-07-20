-- Create a function for admin to execute SQL queries
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow admins to execute SQL
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar SQL';
  END IF;
  
  -- Execute the query and return results as JSON
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;