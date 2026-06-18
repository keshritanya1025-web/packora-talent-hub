
-- Sequence for auto Req IDs
CREATE SEQUENCE IF NOT EXISTS public.requisition_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_req_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.requisition_seq');
  RETURN 'REQ-' || LPAD(next_val::text, 5, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_req_id() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_id TEXT NOT NULL UNIQUE DEFAULT public.generate_req_id(),
  fy TEXT,
  bu TEXT,
  country TEXT,
  location TEXT,
  position_name TEXT NOT NULL,
  position_level TEXT,
  client_name TEXT,
  priority TEXT,
  client_manager TEXT,
  hiring_manager TEXT,
  bu_lead TEXT,
  probable_candidate TEXT,
  date_of_request DATE,
  current_status TEXT NOT NULL DEFAULT 'Open',
  remarks TEXT,
  days_since_open INTEGER,
  dead_days INTEGER DEFAULT 0,
  effective_days_since_open INTEGER,
  position_type TEXT,
  recruiter TEXT,
  new_or_replacement TEXT,
  replacement_name TEXT,
  budget_max NUMERIC,
  final_candidate TEXT,
  offer_released_date DATE,
  offer_accepted_date DATE,
  joining_date DATE,
  month_of_joining TEXT,
  source TEXT,
  cost_of_hire NUMERIC,
  ctc_offered NUMERIC,
  passout_year INTEGER,
  root_cause_category TEXT,
  reason TEXT,
  niche_or_bau TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisitions TO authenticated;
GRANT ALL ON public.requisitions TO service_role;

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requisitions readable by authenticated"
  ON public.requisitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Recruiters and admins can insert requisitions"
  ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Recruiters and admins can update requisitions"
  ON public.requisitions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'system_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Admins can delete requisitions"
  ON public.requisitions FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin')
    OR public.has_role(auth.uid(), 'recruiter')
  );

CREATE TRIGGER trg_requisitions_updated
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_requisitions_status ON public.requisitions(current_status);
CREATE INDEX idx_requisitions_bu ON public.requisitions(bu);
CREATE INDEX idx_requisitions_recruiter ON public.requisitions(recruiter);
CREATE INDEX idx_requisitions_created ON public.requisitions(created_at DESC);
