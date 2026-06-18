export const INTERVIEW_STATUS_OPTIONS = [
  "Scheduled",
  "R1 Cleared",
  "R2 Cleared",
  "R3 Cleared",
  "Selected",
  "Rejected",
  "On Hold",
  "No Show",
  "Withdrawn",
] as const;

export const FEEDBACK_OPTIONS = ["Selected", "Rejected", "On Hold", "Pending", "No Show"] as const;

export type Interview = {
  id: string;
  interview_id: string;
  candidate_id: string;
  req_id: string | null;
  candidate_name: string | null;
  bu: string | null;
  job_level: string | null;
  job_name: string | null;
  recruiter: string | null;
  r1_date: string | null;
  r1_panel: string | null;
  r1_feedback: string | null;
  r2_date: string | null;
  r2_panel: string | null;
  r2_feedback: string | null;
  r3_date: string | null;
  r3_panel: string | null;
  r3_feedback: string | null;
  interview_status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type InterviewInput = Omit<Interview, "id" | "interview_id" | "created_at" | "updated_at">;

export const EMPTY_INTERVIEW: InterviewInput = {
  candidate_id: "",
  req_id: "",
  candidate_name: "",
  bu: "",
  job_level: "",
  job_name: "",
  recruiter: "",
  r1_date: null,
  r1_panel: "",
  r1_feedback: "",
  r2_date: null,
  r2_panel: "",
  r2_feedback: "",
  r3_date: null,
  r3_panel: "",
  r3_feedback: "",
  interview_status: "Scheduled",
  remarks: "",
};

export function normalizeInterviewForDb(input: InterviewInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "Selected": return "bg-green-100 text-green-800";
    case "Rejected": return "bg-red-100 text-red-800";
    case "On Hold": return "bg-gray-200 text-gray-800";
    case "No Show":
    case "Withdrawn": return "bg-orange-100 text-orange-800";
    case "R1 Cleared":
    case "R2 Cleared":
    case "R3 Cleared": return "bg-indigo-100 text-indigo-800";
    default: return "bg-blue-100 text-blue-800";
  }
}

export function feedbackBadgeClass(fb: string | null): string {
  if (!fb) return "bg-gray-100 text-gray-600";
  if (fb === "Selected") return "bg-green-100 text-green-800";
  if (fb === "Rejected") return "bg-red-100 text-red-800";
  if (fb === "On Hold") return "bg-gray-200 text-gray-800";
  if (fb === "No Show") return "bg-orange-100 text-orange-800";
  return "bg-amber-100 text-amber-800";
}

export function roundCompleted(
  date: string | null,
  feedback: string | null,
): boolean {
  return !!date && !!feedback && feedback !== "Pending";
}

export function isSelected(feedback: string | null): boolean {
  return feedback === "Selected" || feedback === "R1 Cleared" || feedback === "R2 Cleared" || feedback === "R3 Cleared";
}
