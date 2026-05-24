
CREATE TABLE public.extension_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  favicon TEXT,
  source TEXT DEFAULT 'extension',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_extension_queue_user ON public.extension_queue(user_id, created_at DESC);

ALTER TABLE public.extension_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own queue"
ON public.extension_queue FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own queue"
ON public.extension_queue FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own queue"
ON public.extension_queue FOR DELETE TO authenticated
USING (user_id = auth.uid());
