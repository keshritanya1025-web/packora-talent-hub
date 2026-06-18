
-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE, grant only what the app actually needs
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_req_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_req_id() TO authenticated;

REVOKE ALL ON FUNCTION public.generate_candidate_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_candidate_id(text) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_interview_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_interview_id() TO authenticated;

REVOKE ALL ON FUNCTION public.generate_offer_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_offer_id() TO authenticated;
