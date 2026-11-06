
CREATE TABLE public.project_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_modules_project_id_idx ON public.project_modules(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_modules TO authenticated;
GRANT ALL ON public.project_modules TO service_role;
ALTER TABLE public.project_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner can manage project modules" ON public.project_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_modules.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_modules.project_id AND p.user_id = auth.uid()));
CREATE TRIGGER project_modules_updated_at BEFORE UPDATE ON public.project_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.module_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.project_modules(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_records_module_id_idx ON public.module_records(module_id);
CREATE INDEX module_records_project_id_idx ON public.module_records(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_records TO authenticated;
GRANT ALL ON public.module_records TO service_role;
ALTER TABLE public.module_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner can manage module records" ON public.module_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = module_records.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = module_records.project_id AND p.user_id = auth.uid()));
CREATE TRIGGER module_records_updated_at BEFORE UPDATE ON public.module_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
