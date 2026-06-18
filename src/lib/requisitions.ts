export const STATUS_OPTIONS = [
  "Open",
  "In Progress",
  "On Hold",
  "Offer Released",
  "Offer Accepted",
  "Joined",
  "Closed",
  "Cancelled",
  "Dead",
] as const;

export const PRIORITY_OPTIONS = ["P0 - Critical", "P1 - High", "P2 - Medium", "P3 - Low"] as const;
export const POSITION_TYPE_OPTIONS = ["Full-time", "Part-time", "Contract", "Intern"] as const;
export const NEW_OR_REPLACEMENT_OPTIONS = ["New", "Replacement"] as const;
export const NICHE_BAU_OPTIONS = ["Niche", "BAU"] as const;

export type Requisition = {
  id: string;
  req_id: string;
  fy: string | null;
  bu: string | null;
  country: string | null;
  location: string | null;
  position_name: string;
  position_level: string | null;
  client_name: string | null;
  priority: string | null;
  client_manager: string | null;
  hiring_manager: string | null;
  bu_lead: string | null;
  probable_candidate: string | null;
  date_of_request: string | null;
  current_status: string;
  remarks: string | null;
  days_since_open: number | null;
  dead_days: number | null;
  effective_days_since_open: number | null;
  position_type: string | null;
  recruiter: string | null;
  new_or_replacement: string | null;
  replacement_name: string | null;
  budget_max: number | null;
  final_candidate: string | null;
  offer_released_date: string | null;
  offer_accepted_date: string | null;
  joining_date: string | null;
  month_of_joining: string | null;
  source: string | null;
  cost_of_hire: number | null;
  ctc_offered: number | null;
  passout_year: number | null;
  root_cause_category: string | null;
  reason: string | null;
  niche_or_bau: string | null;
  created_at: string;
  updated_at: string;
};

export type RequisitionInput = Omit<Requisition, "id" | "req_id" | "created_at" | "updated_at">;

export const EMPTY_REQUISITION: RequisitionInput = {
  fy: "",
  bu: "",
  country: "",
  location: "",
  position_name: "",
  position_level: "",
  client_name: "",
  priority: "",
  client_manager: "",
  hiring_manager: "",
  bu_lead: "",
  probable_candidate: "",
  date_of_request: null,
  current_status: "Open",
  remarks: "",
  days_since_open: null,
  dead_days: 0,
  effective_days_since_open: null,
  position_type: "",
  recruiter: "",
  new_or_replacement: "",
  replacement_name: "",
  budget_max: null,
  final_candidate: "",
  offer_released_date: null,
  offer_accepted_date: null,
  joining_date: null,
  month_of_joining: "",
  source: "",
  cost_of_hire: null,
  ctc_offered: null,
  passout_year: null,
  root_cause_category: "",
  reason: "",
  niche_or_bau: "",
};

// Strip empty strings to null before persisting
export function normalizeForDb(input: RequisitionInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
}

const CSV_COLUMNS: { key: keyof Requisition; label: string }[] = [
  { key: "req_id", label: "Req ID" },
  { key: "fy", label: "FY" },
  { key: "bu", label: "BU" },
  { key: "country", label: "Country" },
  { key: "location", label: "Location" },
  { key: "position_name", label: "Position Name" },
  { key: "position_level", label: "Position Level" },
  { key: "client_name", label: "Client Name" },
  { key: "priority", label: "Priority" },
  { key: "client_manager", label: "Client Manager" },
  { key: "hiring_manager", label: "Hiring Manager" },
  { key: "bu_lead", label: "BU Lead" },
  { key: "probable_candidate", label: "Probable Candidate" },
  { key: "date_of_request", label: "Date of Request" },
  { key: "current_status", label: "Current Status" },
  { key: "remarks", label: "Remarks" },
  { key: "days_since_open", label: "Days Since Open" },
  { key: "dead_days", label: "Dead Days" },
  { key: "effective_days_since_open", label: "Effective Days Since Open" },
  { key: "position_type", label: "Position Type" },
  { key: "recruiter", label: "Recruiter" },
  { key: "new_or_replacement", label: "New or Replacement" },
  { key: "replacement_name", label: "Replacement Name" },
  { key: "budget_max", label: "Budget Max" },
  { key: "final_candidate", label: "Final Candidate" },
  { key: "offer_released_date", label: "Offer Released Date" },
  { key: "offer_accepted_date", label: "Offer Accepted Date" },
  { key: "joining_date", label: "Joining Date" },
  { key: "month_of_joining", label: "Month of Joining" },
  { key: "source", label: "Source" },
  { key: "cost_of_hire", label: "Cost of Hire" },
  { key: "ctc_offered", label: "CTC Offered" },
  { key: "passout_year", label: "Passout Year" },
  { key: "root_cause_category", label: "Root Cause Category" },
  { key: "reason", label: "Reason" },
  { key: "niche_or_bau", label: "Niche or BAU" },
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportRequisitionsCsv(rows: Requisition[]): void {
  const header = CSV_COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => csvEscape(r[c.key])).join(","))
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `requisitions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
