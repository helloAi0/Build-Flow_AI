ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS business_size text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS main_challenge text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;