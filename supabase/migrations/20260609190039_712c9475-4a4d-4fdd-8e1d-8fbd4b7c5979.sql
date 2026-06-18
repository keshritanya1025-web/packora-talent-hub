
CREATE TABLE public.expertise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expertise TO authenticated;
GRANT ALL ON public.expertise TO service_role;
ALTER TABLE public.expertise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view expertise" ON public.expertise
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage expertise" ON public.expertise
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Authenticated insert audit log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX audit_log_created_idx ON public.audit_log(created_at DESC);
