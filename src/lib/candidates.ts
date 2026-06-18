export const CANDIDATE_STATUS_OPTIONS = [
  "Applied",
  "Shortlisted",
  "Interviewed",
  "Offered",
  "Joined",
  "On Hold",
  "Rejected",
] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"] as const;

export type Candidate = {
  id: string;
  candidate_id: string;
  req_id: string | null;
  fy: string | null;
  job_name: string | null;
  bu: string | null;
  job_level: string | null;
  expertise: string | null;
  client_name: string | null;
  country: string | null;
  location: string | null;
  recruiter: string | null;
  candidate_status: string;
  linkedin_url: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  mobile_number: string | null;
  email_address: string | null;
  current_location: string | null;
  education: string | null;
  passout_year: number | null;
  current_organisation: string | null;
  experience: number | null;
  notice_period: string | null;
  source: string | null;
  source_name: string | null;
  portal_name: string | null;
  current_ctc: number | null;
  expected_ctc: number | null;
  rejection_reason: string | null;
  recruiter_remarks: string | null;
  industry_background: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateInput = Omit<Candidate, "id" | "candidate_id" | "created_at" | "updated_at">;

export const EMPTY_CANDIDATE: CandidateInput = {
  req_id: "",
  fy: "",
  job_name: "",
  bu: "",
  job_level: "",
  expertise: "",
  client_name: "",
  country: "",
  location: "",
  recruiter: "",
  candidate_status: "Applied",
  linkedin_url: "",
  full_name: "",
  first_name: "",
  last_name: "",
  gender: "",
  mobile_number: "",
  email_address: "",
  current_location: "",
  education: "",
  passout_year: null,
  current_organisation: "",
  experience: null,
  notice_period: "",
  source: "",
  source_name: "",
  portal_name: "",
  current_ctc: null,
  expected_ctc: null,
  rejection_reason: "",
  recruiter_remarks: "",
  industry_background: "",
};

export function normalizeCandidateForDb(input: CandidateInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "Applied": return "bg-blue-100 text-blue-800";
    case "Shortlisted": return "bg-indigo-100 text-indigo-800";
    case "Interviewed": return "bg-purple-100 text-purple-800";
    case "Offered": return "bg-amber-100 text-amber-800";
    case "Joined": return "bg-green-100 text-green-800";
    case "On Hold": return "bg-gray-200 text-gray-800";
    case "Rejected": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}
