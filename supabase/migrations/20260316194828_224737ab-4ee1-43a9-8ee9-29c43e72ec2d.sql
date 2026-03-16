-- Ensure one cloud vault row per user so upsert(onConflict: 'user_id') works
CREATE UNIQUE INDEX IF NOT EXISTS vault_data_user_id_key
ON public.vault_data (user_id);