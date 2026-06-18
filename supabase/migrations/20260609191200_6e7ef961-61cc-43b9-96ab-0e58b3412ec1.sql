
-- Candidates: restrict SELECT to recruiters & admins
DROP POLICY IF EXISTS "Authenticated can view candidates" ON public.candidates;
CREATE POLICY "Recruiters and admins can view candidates" ON public.candidates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'system_admin'));

-- Interviews
DROP POLICY IF EXISTS "Authenticated can view interviews" ON public.interviews;
CREATE POLICY "Recruiters and admins can view interviews" ON public.interviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'system_admin'));

-- Offers
DROP POLICY IF EXISTS "Authenticated users can view all offers" ON public.offers;
CREATE POLICY "Recruiters and admins can view offers" ON public.offers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'system_admin'));

-- Requisitions
DROP POLICY IF EXISTS "Requisitions readable by authenticated" ON public.requisitions;
CREATE POLICY "Recruiters and admins can view requisitions" ON public.requisitions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'system_admin') OR public.has_role(auth.uid(),'business_lead'));

-- Profiles: own profile or admin
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'system_admin'));

-- Recruiters table: limit to recruiters & admins (still needed for dropdowns)
DROP POLICY IF EXISTS "Recruiters readable" ON public.recruiters;
CREATE POLICY "Recruiters and admins view recruiters" ON public.recruiters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'system_admin'));

-- Audit log: prevent forged inserts. Drop direct insert policy, expose SECURITY DEFINER fn.
DROP POLICY IF EXISTS "Authenticated insert audit log" ON public.audit_log;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity text, _entity_id text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  INSERT INTO public.audit_log (user_id, user_email, action, entity, entity_id, details)
  VALUES (_uid, _email, _action, _entity, _entity_id, _details);
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit(text,text,text,jsonb) TO authenticated;
