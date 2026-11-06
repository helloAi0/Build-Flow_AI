
-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_generation_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_generation_usage(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Replace always-true INSERT policies with minimal validation
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(email) BETWEEN 3 AND 320 AND position('@' in email) > 1);

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(message) BETWEEN 5 AND 5000
    AND type IN ('bug','feature','support')
    AND (user_id IS NULL OR user_id = auth.uid())
  );
