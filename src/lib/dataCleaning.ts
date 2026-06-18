// Data cleaning rules for uploaded recruitment data.

export const ALLOWED_SHEETS = [
  "Resourcing Tracker",
  "Candidate Tracker - India",
  "Candidate Tracker - Global",
  "Interview Tracker",
] as const;

export type AllowedSheet = (typeof ALLOWED_SHEETS)[number];

export const SHEET_TO_ENTITY: Record<string, "requisitions" | "candidates" | "interviews"> = {
  "Resourcing Tracker": "requisitions",
  "Candidate Tracker - India": "candidates",
  "Candidate Tracker - Global": "candidates",
  "Interview Tracker": "interviews",
};

export function isAllowedSheet(name: string): boolean {
  return (ALLOWED_SHEETS as readonly string[]).includes(name.trim());
}

// ---- Column name normalization ----
// Keys are normalized (lowercased, alnum + "_") — see normalizeColumnName.

const COLUMN_ALIASES: Record<string, string> = {
  // requisitions
  req_id: "req_id",
  requisition_id: "req_id",
  position_name: "position_name",
  job_name: "job_name",
  position_level: "position_level",
  job_level: "job_level",
  level: "position_level",
  client_name: "client_name",
  client_internal: "client_name",
  client: "client_name",
  hiring_manager: "hiring_manager",
  hiring_manager_packfora: "hiring_manager",
  bu_lead: "bu_lead",
  business_unit: "bu",
  bu: "bu",
  probable_candidate: "probable_candidate",
  date_of_request: "date_of_request",
  date_of_requistion_dd_mmm_yy: "date_of_request",
  date_of_requisition: "date_of_request",
  current_status: "current_status",
  status: "current_status",
  remarks: "remarks",
  remark: "remarks",
  no_of_days_since_open: "days_since_open",
  dead_days: "dead_days",
  effective_no_of_days_since_open: "effective_days_since_open",
  position_type: "position_type",
  position_type_confidential_regular: "position_type",
  recruiter: "recruiter",
  new_replacement: "new_or_replacement",
  replacement_name: "replacement_name",
  budget_max: "budget_max",
  final_candidate: "final_candidate",
  offer_released_date: "offer_released_date",
  offer_accepted_date: "offer_accepted_date",
  date_of_joining: "joining_date",
  joining_date: "joining_date",
  month_of_joining: "month_of_joining",
  cost_of_hire: "cost_of_hire",
  cost_of_hire_amount_paid_to_consultant: "cost_of_hire",
  ctc_offered: "ctc_offered",
  passout_year: "passout_year",
  business_ta_miss_ta_and_business_miss: "root_cause_category",
  reason: "reason",
  niche_bau: "niche_or_bau",
  // candidates
  candidate_id: "candidate_id",
  full_name: "full_name",
  candidate_name: "full_name",
  first_name: "first_name",
  fisrt_name: "first_name",
  last_name: "last_name",
  lat_name: "last_name",
  mobile_number: "mobile_number",
  phone: "mobile_number",
  email: "email_address",
  email_address: "email_address",
  linkedin: "linkedin_url",
  linkedin_url: "linkedin_url",
  linkedin_link: "linkedin_url",
  current_location: "current_location",
  current_organisation: "current_organisation",
  current_organization: "current_organisation",
  company: "current_organisation",
  experience: "experience",
  notice_period: "notice_period",
  candidate_status: "candidate_status",
  packfora_selection_status: "candidate_status",
  source_ijp_consultant_employee_referral_self_sourced: "source",
  source: "source",
  name_of_source_mention_name_of_employee_ref_consultant_job_portal_direct: "source_name",
  if_self_sourced_name_of_the_portal: "portal_name",
  ctc: "current_ctc",
  current_ctc: "current_ctc",
  ectc: "expected_ctc",
  expected_ctc: "expected_ctc",
  reason_for_rejection_by_packfora: "rejection_reason",
  remarks_recruiter: "recruiter_remarks",
  industry_background: "industry_background",
  expertise: "expertise",
  gender: "gender",
  country: "country",
  location: "location",
  fy: "fy",
  job_opening_date: "job_opening_date", // ignored at insert (not in column whitelist)
  education: "education",
  // interviews
  r1_date: "r1_date",
  r2_date: "r2_date",
  r3_date: "r3_date",
  panel_name: "r1_panel",
  panel_name2: "r2_panel",
  panel_name3: "r3_panel",
  r1_panel: "r1_panel",
  r2_panel: "r2_panel",
  r3_panel: "r3_panel",
  feedback: "r1_feedback",
  feedback2: "r2_feedback",
  feedback3: "r3_feedback",
  r1_feedback: "r1_feedback",
  r2_feedback: "r2_feedback",
  r3_feedback: "r3_feedback",
  interview_status: "interview_status",
  month: "month_of_joining",
};

export function normalizeColumnName(raw: string): string {
  const trimmed = String(raw ?? "").trim().toLowerCase();
  const key = trimmed.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return COLUMN_ALIASES[key] ?? key;
}

// ---- Null-ish detection ----
const NULL_TOKENS = new Set(["", "na", "n/a", "n.a.", "-", "--", "—", "null", "none", "nil", "tbd", "tba"]);
function isNullish(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return NULL_TOKENS.has(v.trim().toLowerCase());
  return false;
}

// ---- Location cleaning ----
const LOCATION_MAP: Record<string, string> = {
  blr: "Bangalore",
  "bangalore urban": "Bangalore",
  bengaluru: "Bangalore",
  mum: "Mumbai",
  bombay: "Mumbai",
  cpt: "Cape Town",
  capetown: "Cape Town",
};

export function cleanLocation(value: unknown): string | null {
  if (isNullish(value)) return null;
  const s = String(value).trim();
  return LOCATION_MAP[s.toLowerCase()] ?? s;
}

// ---- Status normalization ----
export const CANONICAL_STATUSES = [
  "Applied",
  "Shortlisted",
  "Interviewed",
  "Offered",
  "Joined",
  "On Hold",
  "Rejected",
] as const;

const STATUS_MAP: Record<string, (typeof CANONICAL_STATUSES)[number]> = {
  applied: "Applied",
  new: "Applied",
  submitted: "Applied",
  shortlisted: "Shortlisted",
  shortlist: "Shortlisted",
  screened: "Shortlisted",
  interviewed: "Interviewed",
  interview: "Interviewed",
  "in interview": "Interviewed",
  offered: "Offered",
  "offer released": "Offered",
  offer: "Offered",
  joined: "Joined",
  onboarded: "Joined",
  hired: "Joined",
  "on hold": "On Hold",
  hold: "On Hold",
  paused: "On Hold",
  rejected: "Rejected",
  reject: "Rejected",
  declined: "Rejected",
  dropped: "Rejected",
};

export function normalizeStatus(value: unknown): string | null {
  if (isNullish(value)) return null;
  const k = String(value).trim().toLowerCase();
  return STATUS_MAP[k] ?? String(value).trim();
}

// ---- Phone cleaning ----
export function cleanPhone(value: unknown): string | null {
  if (isNullish(value)) return null;
  let s = String(value).replace(/[\s()\-.]/g, "");
  const hasPlus = s.startsWith("+");
  s = s.replace(/[^\d]/g, "");
  if (!s) return null;
  return hasPlus ? `+${s}` : s;
}

// ---- Email cleaning ----
export function cleanEmail(value: unknown): string | null {
  if (isNullish(value)) return null;
  const s = String(value).trim();
  // require a basic @ pattern; otherwise drop so DB / future validation doesn't choke
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s.toLowerCase();
}

// ---- URL cleaning ----
export function cleanUrl(value: unknown): string | null {
  if (isNullish(value)) return null;
  const s = String(value).trim();
  if (!s) return null;
  // accept bare names as-is (some rows just have a person's name) → store only if URL-ish
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(www\.|linkedin\.com)/i.test(s)) return `https://${s.replace(/^https?:\/\//, "")}`;
  return null; // not a URL → drop so it doesn't pollute the linkedin_url column
}

// ---- Date cleaning (Excel serial / strings / Date) ----
export function cleanDate(value: unknown): string | null {
  if (isNullish(value)) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  // Excel serial date number
  if (typeof value === "number" && isFinite(value)) {
    if (value < 1 || value > 80000) return null;
    // Excel epoch: 1899-12-30 UTC (accounts for the 1900 leap bug)
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    // numeric string serial
    if (/^\d+(\.\d+)?$/.test(s)) return cleanDate(parseFloat(s));
    // dd-mm-yyyy / dd/mm/yyyy → try parse
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (m) {
      let [_, dd, mm, yy] = m;
      if (yy.length === 2) yy = `20${yy}`;
      const iso = `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return iso;
    }
    const t = Date.parse(s);
    if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  }
  return null;
}

// ---- Numeric cleaning (handles "15+", "9LPA", "292 USD", etc.) ----
export function cleanNumber(value: unknown): number | null {
  if (isNullish(value)) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  const s = String(value).replace(/,/g, "");
  let multiplier = 1;
  if (/\blpa\b|\blakh|\bl\b/i.test(s)) multiplier = 100000;
  else if (/\bcr\b|\bcrore/i.test(s)) multiplier = 10000000;
  else if (/\bk\b/i.test(s)) multiplier = 1000;
  else if (/\bm\b|\bmn\b/i.test(s)) multiplier = 1000000;
  const m = s.match(/[-+]?\d*\.?\d+/);
  if (!m) return null;
  const n = parseFloat(m[0]) * multiplier;
  return isNaN(n) ? null : n;
}

export function cleanInteger(value: unknown): number | null {
  const n = cleanNumber(value);
  return n === null ? null : Math.round(n);
}

// ---- Compensation cleaning (kept for back-compat) ----
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD", "₹": "INR", rs: "INR", "rs.": "INR", inr: "INR",
  usd: "USD", eur: "EUR", "€": "EUR", "£": "GBP", gbp: "GBP", zar: "ZAR",
};

export interface CompensationValue {
  amount: number | null;
  currency: string | null;
}

export function cleanCompensation(value: unknown): CompensationValue {
  if (isNullish(value)) return { amount: null, currency: null };
  const raw = String(value);
  const lower = raw.toLowerCase();
  let currency: string | null = null;
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (lower.includes(sym)) { currency = code; break; }
  }
  return { amount: cleanNumber(value), currency };
}

// ---- Per-entity field type maps ----
const DATE_FIELDS: Record<string, string[]> = {
  requisitions: ["date_of_request", "offer_released_date", "offer_accepted_date", "joining_date"],
  candidates: [],
  interviews: ["r1_date", "r2_date", "r3_date"],
};

const NUMBER_FIELDS: Record<string, string[]> = {
  requisitions: ["budget_max", "cost_of_hire", "ctc_offered"],
  candidates: ["experience", "current_ctc", "expected_ctc"],
  interviews: [],
};

const INT_FIELDS: Record<string, string[]> = {
  requisitions: ["passout_year", "days_since_open", "dead_days", "effective_days_since_open"],
  candidates: ["passout_year"],
  interviews: [],
};

// ---- Row cleaning per entity ----
export function cleanRow(
  entity: "requisitions" | "candidates" | "interviews",
  rawRow: Record<string, unknown>,
): Record<string, unknown> {
  // normalize keys + trim string values
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const key = normalizeColumnName(k);
    const val = typeof v === "string" ? v.trim() : v;
    // last-write-wins is OK; canonical names are stable
    if (row[key] === undefined || row[key] === null || row[key] === "") row[key] = val;
  }

  // null-ish → null across the board
  for (const f of Object.keys(row)) if (isNullish(row[f])) row[f] = null;

  // location / phone / email / url
  for (const f of ["location", "current_location", "country"]) {
    if (row[f] !== undefined) row[f] = cleanLocation(row[f]);
  }
  if (row.mobile_number !== undefined) row.mobile_number = cleanPhone(row.mobile_number);
  if (row.email_address !== undefined) row.email_address = cleanEmail(row.email_address);
  if (row.linkedin_url !== undefined) row.linkedin_url = cleanUrl(row.linkedin_url);

  // status
  if (entity === "candidates" && row.candidate_status !== undefined) {
    row.candidate_status = normalizeStatus(row.candidate_status);
  }

  // dates
  for (const f of DATE_FIELDS[entity]) {
    if (row[f] !== undefined) row[f] = cleanDate(row[f]);
  }
  // numerics
  for (const f of NUMBER_FIELDS[entity]) {
    if (row[f] !== undefined) row[f] = cleanNumber(row[f]);
  }
  for (const f of INT_FIELDS[entity]) {
    if (row[f] !== undefined) row[f] = cleanInteger(row[f]);
  }

  // also handle anything still as a Date instance
  for (const f of Object.keys(row)) {
    if (row[f] instanceof Date) row[f] = (row[f] as Date).toISOString().slice(0, 10);
  }
  // final pass: empty strings → null
  for (const f of Object.keys(row)) if (row[f] === "") row[f] = null;
  return row;
}
