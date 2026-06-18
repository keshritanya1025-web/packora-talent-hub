
ALTER FUNCTION public.generate_req_id() SECURITY INVOKER;
ALTER FUNCTION public.generate_candidate_id(text) SECURITY INVOKER;
ALTER FUNCTION public.generate_interview_id() SECURITY INVOKER;
ALTER FUNCTION public.generate_offer_id() SECURITY INVOKER;

GRANT USAGE ON SEQUENCE public.requisition_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.candidate_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.interview_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.offer_seq TO authenticated;
