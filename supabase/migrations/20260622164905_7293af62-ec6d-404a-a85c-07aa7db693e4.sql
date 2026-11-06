
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Seed admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'tahaudaipurwala68@gmail.com'
ON CONFLICT DO NOTHING;

-- Waitlist
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL UNIQUE,
  business_type text,
  source text NOT NULL DEFAULT 'waitlist',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view waitlist" ON public.waitlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Feedback
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('bug','feature','support')),
  message text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users view own feedback" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all feedback" ON public.feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Usage counters (per user per month)
CREATE TABLE public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  generations int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);
GRANT SELECT, INSERT, UPDATE ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.usage_counters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage" ON public.usage_counters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own usage" ON public.usage_counters FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all usage" ON public.usage_counters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Increment helper (atomic)
CREATE OR REPLACE FUNCTION public.increment_generation_usage(_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _month date := date_trunc('month', now())::date;
  _count int;
BEGIN
  INSERT INTO public.usage_counters (user_id, period_month, generations)
  VALUES (_user_id, _month, 1)
  ON CONFLICT (user_id, period_month)
  DO UPDATE SET generations = public.usage_counters.generations + 1, updated_at = now()
  RETURNING generations INTO _count;
  RETURN _count;
END;
$$;

-- Admin read-all policies for analytics
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all projects" ON public.projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all solutions" ON public.generated_solutions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
