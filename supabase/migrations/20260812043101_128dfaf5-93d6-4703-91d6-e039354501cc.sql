ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.project_modules TO anon;
GRANT SELECT, INSERT ON public.module_records TO anon;

CREATE OR REPLACE FUNCTION public.is_public_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.is_public)
$$;

CREATE POLICY "Public projects are viewable by anyone"
ON public.projects FOR SELECT TO anon
USING (is_public);

CREATE POLICY "Public project pages are viewable by anyone"
ON public.project_modules FOR SELECT TO anon
USING (public.is_public_project(project_id));

CREATE POLICY "Public catalog records are viewable by anyone"
ON public.module_records FOR SELECT TO anon
USING (
  public.is_public_project(project_id)
  AND kind = ANY (ARRAY['products','menu','website','portfolio','blog','events','courses','plans','properties','vehicles','rooms','reviews','knowledge_base','services'])
);

CREATE POLICY "Visitors can submit requests to public sites"
ON public.module_records FOR INSERT TO anon
WITH CHECK (
  public.is_public_project(project_id)
  AND kind = ANY (ARRAY['orders','reservations','bookings','leads','tickets','reviews','attendees','donations'])
);