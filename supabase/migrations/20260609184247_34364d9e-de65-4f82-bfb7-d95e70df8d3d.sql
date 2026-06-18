CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id TEXT NOT NULL UNIQUE,
  candidate_id TEXT,
  req_id TEXT,
  candidate_name TEXT,
  position_name TEXT,
  recruiter TEXT,
  offer_released_date DATE,
  offer_accepted_date DATE,
  joining_date DATE,
  ctc_offered NUMERIC,
  offer_status TEXT NOT NULL DEFAULT 'Released',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all offers" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters and admins can create offers" ON public.offers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Recruiters and admins can update offers" ON public.offers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Only admins can delete offers" ON public.offers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

CREATE SEQUENCE IF NOT EXISTS public.offer_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_offer_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'OFF-' || LPAD(nextval('public.offer_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();