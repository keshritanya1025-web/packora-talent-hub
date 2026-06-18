export type FieldType = "string" | "number" | "date" | "email" | "url";

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  aliases?: string[];
}

export interface EntitySchema {
  key: string;
  label: string;
  fields: FieldSpec[];
}

export const ENTITY_SCHEMAS: EntitySchema[] = [
  {
    key: "requisitions",
    label: "Requisitions",
    fields: [
      { key: "req_id", label: "Req ID", type: "string", required: true, aliases: ["requisition id", "req"] },
      { key: "fy", label: "FY", type: "string" },
      { key: "bu", label: "BU", type: "string", aliases: ["business unit"] },
      { key: "country", label: "Country", type: "string" },
      { key: "location", label: "Location", type: "string" },
      { key: "position_name", label: "Position Name", type: "string", required: true, aliases: ["job name", "role"] },
      { key: "position_level", label: "Position Level", type: "string", aliases: ["level"] },
      { key: "client_name", label: "Client Name", type: "string" },
      { key: "priority", label: "Priority", type: "string" },
      { key: "hiring_manager", label: "Hiring Manager", type: "string" },
      { key: "date_of_request", label: "Date of Request", type: "date" },
      { key: "current_status", label: "Current Status", type: "string", aliases: ["status"] },
      { key: "ctc_offered", label: "CTC Offered", type: "number" },
      { key: "source", label: "Source", type: "string" },
    ],
  },
  {
    key: "candidates",
    label: "Candidates",
    fields: [
      { key: "candidate_id", label: "Candidate ID", type: "string" },
      { key: "req_id", label: "Req ID", type: "string", required: true },
      { key: "full_name", label: "Full Name", type: "string", required: true, aliases: ["name", "candidate name"] },
      { key: "email_address", label: "Email Address", type: "email", aliases: ["email"] },
      { key: "mobile_number", label: "Mobile Number", type: "string", aliases: ["phone", "mobile"] },
      { key: "linkedin_url", label: "LinkedIn URL", type: "url", aliases: ["linkedin"] },
      { key: "gender", label: "Gender", type: "string" },
      { key: "current_location", label: "Current Location", type: "string" },
      { key: "current_organisation", label: "Current Organisation", type: "string", aliases: ["company"] },
      { key: "experience", label: "Experience", type: "number" },
      { key: "notice_period", label: "Notice Period", type: "string" },
      { key: "passout_year", label: "Passout Year", type: "number" },
      { key: "candidate_status", label: "Candidate Status", type: "string", aliases: ["status"] },
      { key: "source", label: "Source", type: "string" },
    ],
  },
  {
    key: "interviews",
    label: "Interviews",
    fields: [
      { key: "candidate_id", label: "Candidate ID", type: "string", required: true },
      { key: "req_id", label: "Req ID", type: "string", required: true },
      { key: "candidate_name", label: "Candidate Name", type: "string" },
      { key: "r1_date", label: "R1 Date", type: "date" },
      { key: "r1_panel", label: "R1 Panel", type: "string" },
      { key: "r1_feedback", label: "R1 Feedback", type: "string" },
      { key: "r2_date", label: "R2 Date", type: "date" },
      { key: "r2_panel", label: "R2 Panel", type: "string" },
      { key: "r2_feedback", label: "R2 Feedback", type: "string" },
      { key: "r3_date", label: "R3 Date", type: "date" },
      { key: "interview_status", label: "Interview Status", type: "string" },
      { key: "remarks", label: "Remarks", type: "string" },
    ],
  },
  {
    key: "offers",
    label: "Offers",
    fields: [
      { key: "candidate_id", label: "Candidate ID", type: "string", required: true },
      { key: "req_id", label: "Req ID", type: "string", required: true },
      { key: "candidate_name", label: "Candidate Name", type: "string" },
      { key: "position_name", label: "Position Name", type: "string" },
      { key: "recruiter", label: "Recruiter", type: "string" },
      { key: "offer_released_date", label: "Offer Released Date", type: "date" },
      { key: "offer_accepted_date", label: "Offer Accepted Date", type: "date" },
      { key: "joining_date", label: "Joining Date", type: "date" },
      { key: "ctc_offered", label: "CTC Offered", type: "number" },
      { key: "offer_status", label: "Offer Status", type: "string", required: true },
    ],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function autoMatchField(column: string, fields: FieldSpec[]): string | null {
  const c = norm(column);
  for (const f of fields) {
    if (norm(f.key) === c || norm(f.label) === c) return f.key;
    if (f.aliases?.some((a) => norm(a) === c)) return f.key;
  }
  for (const f of fields) {
    if (norm(f.label).includes(c) || c.includes(norm(f.label))) return f.key;
  }
  return null;
}

function isDateLike(v: unknown): boolean {
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v === "number") return v > 25569 && v < 80000; // excel serial range
  if (typeof v === "string") return !isNaN(Date.parse(v));
  return false;
}

export function validateValue(value: unknown, type: FieldType): string | null {
  if (value === null || value === undefined || value === "") return null;
  switch (type) {
    case "number":
      if (typeof value === "number") return null;
      if (typeof value === "string" && !isNaN(Number(value))) return null;
      return `expected number, got "${value}"`;
    case "date":
      return isDateLike(value) ? null : `expected date, got "${value}"`;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ? null : `invalid email "${value}"`;
    case "url":
      try {
        new URL(String(value));
        return null;
      } catch {
        return `invalid URL "${value}"`;
      }
    case "string":
      return null;
  }
}

export function inferColumnType(samples: unknown[]): FieldType {
  const vals = samples.filter((v) => v !== null && v !== undefined && v !== "");
  if (vals.length === 0) return "string";
  if (vals.every((v) => typeof v === "number" || !isNaN(Number(v as string)))) return "number";
  if (vals.every(isDateLike)) return "date";
  if (vals.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) return "email";
  return "string";
}
