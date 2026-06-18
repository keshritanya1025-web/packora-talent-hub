
CREATE SEQUENCE IF NOT EXISTS public.interview_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_interview_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'INT-' || LPAD(nextval('public.interview_seq')::text, 5, '0');
END;
$$;

CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id TEXT NOT NULL UNIQUE,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(candidate_id) ON DELETE CASCADE,
  req_id TEXT REFERENCES public.requisitions(req_id) ON DELETE SET NULL,
  candidate_name TEXT,
  bu TEXT,
  job_level TEXT,
  job_name TEXT,
  recruiter TEXT,
  r1_date DATE,
  r1_panel TEXT,
  r1_feedback TEXT,
  r2_date DATE,
  r2_panel TEXT,
  r2_feedback TEXT,
  r3_date DATE,
  r3_panel TEXT,
  r3_feedback TEXT,
  interview_status TEXT NOT NULL DEFAULT 'Scheduled',
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view interviews"
  ON public.interviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Recruiters and admins can insert interviews"
  ON public.interviews FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Recruiters and admins can update interviews"
  ON public.interviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Admins can delete interviews"
  ON public.interviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'));

CREATE TRIGGER interviews_touch_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX idx_interviews_req_id ON public.interviews(req_id);
CREATE INDEX idx_interviews_status ON public.interviews(interview_status);
