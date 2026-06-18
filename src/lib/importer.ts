import { supabase } from "@/integrations/supabase/client";
import { cleanRow } from "./dataCleaning";

export type EntityKind = "requisitions" | "candidates" | "interviews";

// Whitelist of columns we will insert per entity.
export const ENTITY_COLUMNS: Record<EntityKind, string[]> = {
  requisitions: [
    "req_id","fy","bu","country","location","position_name","position_level","client_name",
    "priority","client_manager","hiring_manager","bu_lead","probable_candidate","date_of_request",
    "current_status","remarks","position_type","recruiter","new_or_replacement","replacement_name",
    "budget_max","final_candidate","offer_released_date","offer_accepted_date","joining_date",
    "month_of_joining","source","cost_of_hire","ctc_offered","passout_year","root_cause_category",
    "reason","niche_or_bau",
  ],
  candidates: [
    "candidate_id","req_id","fy","job_name","bu","job_level","expertise","client_name","country",
    "location","recruiter","candidate_status","linkedin_url","full_name","first_name","last_name",
    "gender","mobile_number","email_address","current_location","education","passout_year",
    "current_organisation","experience","notice_period","source","source_name","portal_name",
    "current_ctc","expected_ctc","rejection_reason","recruiter_remarks","industry_background",
  ],
  interviews: [
    "interview_id","candidate_id","req_id","candidate_name","bu","job_level","job_name","recruiter",
    "r1_date","r1_panel","r1_feedback","r2_date","r2_panel","r2_feedback","r3_date","r3_panel",
    "r3_feedback","interview_status","remarks",
  ],
};

// We always require at least one identifying field; interviews can be auto-stubbed.
export const REQUIRED_FIELDS: Record<EntityKind, string[]> = {
  requisitions: ["position_name"],
  candidates: ["full_name"],
  interviews: [], // we resolve/auto-create candidate_id below
};

function pick(row: Record<string, unknown>, allowed: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (row[k] !== undefined && row[k] !== null) out[k] = row[k];
  return out;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  errors: ImportRowError[];
}

// ---- Deduplication ----
// Build a stable fingerprint over content fields, ignoring generated IDs and casing/whitespace.
const IGNORE_FOR_FINGERPRINT: Record<EntityKind, Set<string>> = {
  requisitions: new Set(["req_id"]),
  candidates: new Set(["candidate_id"]),
  interviews: new Set(["interview_id"]),
};

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim().toLowerCase();
}

function fingerprint(entity: EntityKind, row: Record<string, unknown>): string {
  const skip = IGNORE_FOR_FINGERPRINT[entity];
  const keys = ENTITY_COLUMNS[entity].filter((k) => !skip.has(k)).sort();
  return keys.map((k) => `${k}=${norm(row[k])}`).join("|");
}

// Natural-key fingerprints used to detect duplicates already in the DB.
function naturalKeys(entity: EntityKind, row: Record<string, unknown>): string[] {
  const keys: string[] = [];
  if (entity === "requisitions") {
    if (row.req_id) keys.push(`id:${norm(row.req_id)}`);
    if (row.position_name) {
      keys.push(
        `nk:${norm(row.position_name)}|${norm(row.bu)}|${norm(row.client_name)}|${norm(row.date_of_request)}|${norm(row.recruiter)}`,
      );
    }
  } else if (entity === "candidates") {
    if (row.candidate_id) keys.push(`id:${norm(row.candidate_id)}`);
    if (row.email_address) keys.push(`email:${norm(row.email_address)}`);
    if (row.full_name && row.mobile_number) {
      keys.push(`nm:${norm(row.full_name)}|${norm(row.mobile_number)}`);
    }
  } else {
    if (row.interview_id) keys.push(`id:${norm(row.interview_id)}`);
    if (row.candidate_id) {
      keys.push(
        `nk:${norm(row.candidate_id)}|${norm(row.r1_date)}|${norm(row.r2_date)}|${norm(row.r3_date)}`,
      );
    }
  }
  return keys;
}

async function loadExistingKeys(entity: EntityKind): Promise<Set<string>> {
  const set = new Set<string>();
  const cols =
    entity === "requisitions"
      ? "req_id,position_name,bu,client_name,date_of_request,recruiter"
      : entity === "candidates"
        ? "candidate_id,email_address,full_name,mobile_number"
        : "interview_id,candidate_id,r1_date,r2_date,r3_date";
  // Page through to avoid the default 1000-row cap
  const page = 1000;
  for (let from = 0; from < 100000; from += page) {
    const { data, error } = await supabase
      .from(entity)
      .select(cols)
      .range(from, from + page - 1);
    if (error || !data || data.length === 0) break;
    (data as any[]).forEach((r) => naturalKeys(entity, r).forEach((k) => set.add(k)));
    if (data.length < page) break;
  }
  return set;
}

const CHUNK = 50;

async function generateIdsForCandidates(rows: Record<string, unknown>[]) {
  for (const r of rows) {
    if (!r.candidate_id && r.full_name) {
      try {
        const { data } = await supabase.rpc("generate_candidate_id", { _full_name: String(r.full_name) });
        if (data) r.candidate_id = data;
      } catch {
        // fall back to a synthesized id so the row still imports
        r.candidate_id = `CAND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      }
    }
  }
}

async function generateIdsForInterviews(rows: Record<string, unknown>[]) {
  for (const r of rows) {
    if (!r.interview_id) {
      try {
        const { data } = await supabase.rpc("generate_interview_id");
        if (data) r.interview_id = data;
      } catch {
        r.interview_id = `INT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      }
    }
  }
}

// Try to find candidate_id from candidate_name (case-insensitive).
async function resolveCandidateIds(rows: Record<string, unknown>[]) {
  const namesNeeded = Array.from(
    new Set(
      rows
        .filter((r) => !r.candidate_id && r.candidate_name)
        .map((r) => String(r.candidate_name).trim().toLowerCase()),
    ),
  );
  if (namesNeeded.length === 0) return;

  const map = new Map<string, string>();
  // Query in batches to avoid huge IN clauses
  for (let i = 0; i < namesNeeded.length; i += 100) {
    const slice = namesNeeded.slice(i, i + 100);
    const { data } = await supabase
      .from("candidates")
      .select("candidate_id, full_name")
      .in("full_name", slice);
    (data ?? []).forEach((c) => {
      if (c.full_name) map.set(String(c.full_name).trim().toLowerCase(), c.candidate_id);
    });
  }

  // Auto-create stub candidates for names we still don't have
  for (const r of rows) {
    if (r.candidate_id) continue;
    const name = r.candidate_name ? String(r.candidate_name).trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (map.has(key)) {
      r.candidate_id = map.get(key)!;
      continue;
    }
    // create stub
    try {
      const { data: newId } = await supabase.rpc("generate_candidate_id", { _full_name: name });
      const stubId = newId ?? `CAND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const { error } = await supabase.from("candidates").insert({
        candidate_id: stubId,
        full_name: name,
        bu: r.bu ?? null,
        job_level: r.job_level ?? null,
        job_name: r.job_name ?? null,
        recruiter: r.recruiter ?? null,
        req_id: r.req_id ?? null,
        candidate_status: "Interviewed",
      } as never);
      if (!error) {
        r.candidate_id = stubId;
        map.set(key, stubId);
      }
    } catch {
      // ignore — row will be reported as failed below
    }
  }
}

export async function importRows(
  entity: EntityKind,
  rawRows: Record<string, unknown>[],
): Promise<ImportResult> {
  const errors: ImportRowError[] = [];
  const cleaned: Record<string, unknown>[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // header is row 1
    try {
      const c = cleanRow(entity, raw);
      // Interviews use `candidate_name`; the sheet's "Full Name" lands as `full_name`.
      if (entity === "interviews" && !c.candidate_name && c.full_name) {
        c.candidate_name = c.full_name;
      }
      const missing = REQUIRED_FIELDS[entity].filter((f) => !c[f]);
      if (missing.length) {
        errors.push({ row: rowNum, message: `Missing required: ${missing.join(", ")}` });
        return;
      }
      cleaned.push({ ...pick(c, ENTITY_COLUMNS[entity]), __row: rowNum });
    } catch (e) {
      errors.push({ row: rowNum, message: (e as Error).message });
    }
  });

  // generate IDs that DB requires explicitly
  if (entity === "candidates") await generateIdsForCandidates(cleaned);
  if (entity === "interviews") {
    await resolveCandidateIds(cleaned);
    await generateIdsForInterviews(cleaned);
    // Filter out interviews that still have no candidate_id
    for (let i = cleaned.length - 1; i >= 0; i--) {
      if (!cleaned[i].candidate_id) {
        errors.push({
          row: cleaned[i].__row as number,
          message: "Could not resolve candidate_id (no candidate_name or matching candidate)",
        });
        cleaned.splice(i, 1);
      }
    }
  }

  // ---- Dedupe: drop intra-batch and DB-existing duplicates before insert ----
  let skipped = 0;
  const seenContent = new Set<string>();
  const seenNatural = new Set<string>();
  let existingDb: Set<string>;
  try {
    existingDb = await loadExistingKeys(entity);
  } catch {
    existingDb = new Set();
  }
  const deduped: Record<string, unknown>[] = [];
  for (const row of cleaned) {
    const fp = fingerprint(entity, row);
    if (seenContent.has(fp)) { skipped++; continue; }
    const nks = naturalKeys(entity, row);
    const dupNatural = nks.some((k) => seenNatural.has(k) || existingDb.has(k));
    if (dupNatural) { skipped++; continue; }
    seenContent.add(fp);
    nks.forEach((k) => seenNatural.add(k));
    deduped.push(row);
  }

  let imported = 0;
  for (let i = 0; i < deduped.length; i += CHUNK) {
    const batch = deduped.slice(i, i + CHUNK);
    const payload = batch.map(({ __row: _row, ...rest }) => rest);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (supabase.from(entity) as any)
      .insert(payload, { count: "exact" });
    if (error) {
      // Fallback: insert rows one-by-one so one bad row doesn't fail the batch
      for (const row of batch) {
        const { __row, ...rest } = row;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rowErr } = await (supabase.from(entity) as any).insert(rest);
        if (rowErr) {
          // Treat unique-constraint collisions as silent skips
          if (/duplicate key|unique constraint/i.test(rowErr.message)) {
            skipped += 1;
          } else {
            errors.push({ row: __row as number, message: rowErr.message });
          }
        } else {
          imported += 1;
        }
      }
    } else {
      imported += count ?? batch.length;
    }
  }

  return {
    total: rawRows.length,
    imported,
    failed: rawRows.length - imported - skipped,
    skipped,
    errors,
  };
}
