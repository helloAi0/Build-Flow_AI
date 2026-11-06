CREATE OR REPLACE FUNCTION public.is_public_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.is_public)
$$;