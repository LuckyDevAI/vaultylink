-- Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_free_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, expires_at, auto_renew, notified_expiry)
  VALUES (NEW.id, 'free'::public.plan_type, NEW.created_at + INTERVAL '10 days', false, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_free_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_free_plan
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_free_plan();

-- Unique constraint required by ON CONFLICT (user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_plans'::regclass
      AND contype = 'u'
      AND conname = 'user_plans_user_id_key'
  ) THEN
    ALTER TABLE public.user_plans ADD CONSTRAINT user_plans_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Backfill existing users without a plan
INSERT INTO public.user_plans (user_id, plan, expires_at, auto_renew, notified_expiry)
SELECT u.id, 'free'::public.plan_type, u.created_at + INTERVAL '10 days', false, false
FROM auth.users u
LEFT JOIN public.user_plans p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;