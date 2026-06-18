
CREATE SEQUENCE IF NOT EXISTS public.candidate_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_candidate_id(_full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  initials TEXT;
  parts TEXT[];
  next_val BIGINT;
BEGIN
  parts := regexp_split_to_array(trim(coalesce(_full_name, '')), '\s+');
  IF array_length(parts, 1) IS NULL OR parts[1] = '' THEN
    initials := 'XXX';
  ELSE
    initials := upper(substr(parts[1], 1, 1));
    IF array_length(parts, 1) >= 2 THEN
      initials := initials || upper(substr(parts[array_length(parts,1)], 1, 1));
    END IF;
    initials := rpad(initials, 3, 'X');
  END IF;
  next_val := nextval('public.candidate_seq');
  RETURN 'CAND-' || initials || '-' || next_val::text;
END;
$$;

CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL UNIQUE,
  req_id TEXT REFERENCES public.requisitions(req_id) ON DELETE SET NULL,
  fy TEXT,
  job_name TEXT,
  bu TEXT,
  job_level TEXT,
  expertise TEXT,
  client_name TEXT,
  country TEXT,
  location TEXT,
  recruiter TEXT,
  candidate_status TEXT NOT NULL DEFAULT 'Applied',
  linkedin_url TEXT,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  mobile_number TEXT,
  email_address TEXT,
  current_location TEXT,
  education TEXT,
  passout_year INTEGER,
  current_organisation TEXT,
  experience NUMERIC,
  notice_period TEXT,
  source TEXT,
  source_name TEXT,
  portal_name TEXT,
  current_ctc NUMERIC,
  expected_ctc NUMERIC,
  rejection_reason TEXT,
  recruiter_remarks TEXT,
  industry_background TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view candidates"
  ON public.candidates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Recruiters and admins can insert candidates"
  ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Recruiters and admins can update candidates"
  ON public.candidates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Admins can delete candidates"
  ON public.candidates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'));

CREATE TRIGGER candidates_touch_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_candidates_req_id ON public.candidates(req_id);
CREATE INDEX idx_candidates_status ON public.candidates(candidate_status);
CREATE INDEX idx_candidates_full_name ON public.candidates(full_name);
