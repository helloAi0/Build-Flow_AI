CREATE OR REPLACE FUNCTION public.increment_generation_usage(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _month date := date_trunc('month', now())::date;
  _count int;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.usage_counters (user_id, period_month, generations)
  VALUES (_user_id, _month, 1)
  ON CONFLICT (user_id, period_month)
  DO UPDATE SET generations = public.usage_counters.generations + 1, updated_at = now()
  RETURNING generations INTO _count;
  RETURN _count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_generation_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_generation_usage(uuid) TO authenticated, service_role;