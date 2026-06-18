export const OFFER_STATUS_OPTIONS = [
  "Released",
  "Accepted",
  "Declined",
  "Joined",
] as const;

export type Offer = {
  id: string;
  offer_id: string;
  candidate_id: string | null;
  req_id: string | null;
  candidate_name: string | null;
  position_name: string | null;
  recruiter: string | null;
  offer_released_date: string | null;
  offer_accepted_date: string | null;
  joining_date: string | null;
  ctc_offered: number | null;
  offer_status: string;
  created_at: string;
  updated_at: string;
};

export type OfferInput = Omit<Offer, "id" | "offer_id" | "created_at" | "updated_at">;

export const EMPTY_OFFER: OfferInput = {
  candidate_id: "",
  req_id: "",
  candidate_name: "",
  position_name: "",
  recruiter: "",
  offer_released_date: null,
  offer_accepted_date: null,
  joining_date: null,
  ctc_offered: null,
  offer_status: "Released",
};

export function normalizeOfferForDb(input: OfferInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
}

export function offerStatusBadgeClass(status: string): string {
  switch (status) {
    case "Released": return "bg-blue-100 text-blue-800";
    case "Accepted": return "bg-green-100 text-green-800";
    case "Declined": return "bg-red-100 text-red-800";
    case "Joined": return "bg-emerald-100 text-emerald-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

const CSV_COLUMNS: { key: keyof Offer; label: string }[] = [
  { key: "offer_id", label: "Offer ID" },
  { key: "candidate_id", label: "Candidate ID" },
  { key: "req_id", label: "Req ID" },
  { key: "candidate_name", label: "Candidate Name" },
  { key: "position_name", label: "Position Name" },
  { key: "recruiter", label: "Recruiter" },
  { key: "offer_released_date", label: "Offer Released Date" },
  { key: "offer_accepted_date", label: "Offer Accepted Date" },
  { key: "joining_date", label: "Joining Date" },
  { key: "ctc_offered", label: "CTC Offered" },
  { key: "offer_status", label: "Offer Status" },
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportOffersCsv(rows: Offer[]): void {
  const header = CSV_COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => csvEscape(r[c.key])).join(","))
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `offers_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
