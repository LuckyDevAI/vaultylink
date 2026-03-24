
-- Fix 1: Drop the overly permissive "Admins can manage roles" ALL policy
-- and replace with separate SELECT-less policies that restrict INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Set search_path on all functions missing it
ALTER FUNCTION public.delete_email SET search_path = public;
ALTER FUNCTION public.enqueue_email SET search_path = public;
ALTER FUNCTION public.move_to_dlq SET search_path = public;
ALTER FUNCTION public.read_email_batch SET search_path = public;
