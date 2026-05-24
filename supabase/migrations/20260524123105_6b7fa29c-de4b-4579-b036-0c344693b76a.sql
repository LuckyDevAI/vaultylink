-- 1) Restrict Realtime channel subscriptions to the user's own vault topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only subscribe to own vault channel" ON realtime.messages;
CREATE POLICY "Users can only subscribe to own vault channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'vault_data:' || auth.uid()::text
);

-- 2) Defense-in-depth on user_roles
DROP POLICY IF EXISTS "Restrict role inserts to admins" ON public.user_roles;
CREATE POLICY "Restrict role inserts to admins"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Restrict role updates to admins" ON public.user_roles;
CREATE POLICY "Restrict role updates to admins"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Restrict role deletes to admins" ON public.user_roles;
CREATE POLICY "Restrict role deletes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));