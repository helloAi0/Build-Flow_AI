CREATE TABLE public.project_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  label text NOT NULL,
  summary text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

GRANT SELECT, INSERT, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;

ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own versions" ON public.project_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners create own versions" ON public.project_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners delete own versions" ON public.project_versions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all versions" ON public.project_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.project_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.project_events TO authenticated;
GRANT ALL ON public.project_events TO service_role;

ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own events" ON public.project_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners create own events" ON public.project_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins view all events" ON public.project_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX project_events_project_created_idx ON public.project_events (project_id, created_at DESC);
CREATE INDEX project_versions_project_version_idx ON public.project_versions (project_id, version DESC);