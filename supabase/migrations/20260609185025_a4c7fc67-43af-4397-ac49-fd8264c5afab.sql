
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  sheet_name TEXT NOT NULL,
  entity TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.import_history TO authenticated;
GRANT ALL ON public.import_history TO service_role;

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own import history"
  ON public.import_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Users insert own import history"
  ON public.import_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX import_history_user_idx ON public.import_history(user_id, created_at DESC);
