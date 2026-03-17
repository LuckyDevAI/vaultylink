
-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('yearly', 'lifetime', 'frozen');

-- Create user_plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan plan_type NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  notified_expiry BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Users can read own plan
CREATE POLICY "Users can read own plan" ON public.user_plans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all plans
CREATE POLICY "Admins can manage plans" ON public.user_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
