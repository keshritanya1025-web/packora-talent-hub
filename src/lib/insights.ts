/**
 * Rule-based insights engine. Pure functions, no network calls, no credits.
 * Consumes the same row arrays the dashboard already fetches.
 */

export type InsightTone = "positive" | "warning" | "neutral" | "critical";

export interface Insight {
  icon: string;
  tone: InsightTone;
  text: string;
}

type Row = Record<string, any>;

const DAY = 86_400_000;

function pct(num: number, den: number): number {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

function topEntry(rows: Row[], key: string): { name: string; count: number } | null {
  const m: Record<string, number> = {};
  rows.forEach((r) => {
    const v = r?.[key];
    if (!v) return;
    const k = String(v);
    m[k] = (m[k] ?? 0) + 1;
  });
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return { name: entries[0][0], count: entries[0][1] };
}

export function buildInsights(args: {
  candidates: Row[];
  requisitions: Row[];
  interviews: Row[];
  offers: Row[];
}): Insight[] {
  const { candidates, requisitions, interviews, offers } = args;
  const out: Insight[] = [];

  // 1. Week-over-week candidate growth
  const newLast7 = candidates.filter((c) => (daysSince(c.created_at) ?? 999) <= 7).length;
  const newPrev7 = candidates.filter((c) => {
    const d = daysSince(c.created_at);
    return d !== null && d > 7 && d <= 14;
  }).length;
  if (newLast7 > 0 || newPrev7 > 0) {
    const delta = newPrev7 === 0 ? 100 : Math.round(((newLast7 - newPrev7) / newPrev7) * 100);
    const tone: InsightTone = delta >= 0 ? "positive" : "warning";
    const arrow = delta >= 0 ? "up" : "down";
    out.push({
      icon: delta >= 0 ? "📈" : "📉",
      tone,
      text: `${newLast7} new candidate${newLast7 === 1 ? "" : "s"} added in the last 7 days — ${arrow} ${Math.abs(delta)}% vs the previous week.`,
    });
  }

  // 2. Stale open requisitions
  const openReqs = requisitions.filter((r) => String(r.current_status ?? "").toLowerCase() === "open");
  const stale = openReqs
    .map((r) => ({ r, days: daysSince(r.date_of_request) ?? 0 }))
    .filter((x) => x.days > 45)
    .sort((a, b) => b.days - a.days);
  if (stale.length) {
    const oldest = stale[0];
    out.push({
      icon: "⚠️",
      tone: "warning",
      text: `${stale.length} requisition${stale.length === 1 ? "" : "s"} open for more than 45 days. Oldest: ${oldest.r.req_id ?? "—"} (${oldest.days} days).`,
    });
  }

  // 3. Offer-acceptance rate this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthOffers = offers.filter((o) => {
    const t = o.offer_released_date ? new Date(o.offer_released_date).getTime() : null;
    return t !== null && t >= monthStart.getTime();
  });
  if (monthOffers.length) {
    const accepted = monthOffers.filter((o) => ["Accepted", "Joined"].includes(o.offer_status)).length;
    const rate = pct(accepted, monthOffers.length);
    const tone: InsightTone = rate >= 70 ? "positive" : rate >= 50 ? "neutral" : "warning";
    out.push({
      icon: "🎯",
      tone,
      text: `Offer-acceptance rate this month: ${rate}% (${accepted} of ${monthOffers.length}).`,
    });
  }

  // 4. Top hiring source
  const top = topEntry(candidates, "source");
  if (top && candidates.length) {
    const share = pct(top.count, candidates.length);
    out.push({
      icon: "🔥",
      tone: "neutral",
      text: `Top hiring source: ${top.name} (${share}% of all candidates).`,
    });
  }

  // 5. Interview → offer turnaround
  const turns: number[] = [];
  offers.forEach((o) => {
    if (!o.candidate_id || !o.offer_released_date) return;
    const candInts = interviews
      .filter((i) => i.candidate_id === o.candidate_id && i.interview_date)
      .map((i) => new Date(i.interview_date).getTime())
      .filter((t) => !Number.isNaN(t));
    if (!candInts.length) return;
    const latestInt = Math.max(...candInts);
    const offT = new Date(o.offer_released_date).getTime();
    if (!Number.isNaN(offT) && offT >= latestInt) {
      turns.push((offT - latestInt) / DAY);
    }
  });
  if (turns.length) {
    const avg = turns.reduce((a, b) => a + b, 0) / turns.length;
    out.push({
      icon: "⏳",
      tone: avg <= 7 ? "positive" : avg <= 14 ? "neutral" : "warning",
      text: `Average interview → offer turnaround: ${avg.toFixed(1)} days (across ${turns.length} offers).`,
    });
  }

  // 6. Pipeline bottleneck
  const statusCounts: Record<string, number> = {};
  candidates.forEach((c) => {
    const s = c.candidate_status;
    if (!s) return;
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  });
  const stages = ["Applied", "Shortlisted", "Interviewed", "Offered", "Joined"];
  let maxStage = "";
  let maxCount = 0;
  stages.forEach((s) => {
    if ((statusCounts[s] ?? 0) > maxCount) {
      maxCount = statusCounts[s] ?? 0;
      maxStage = s;
    }
  });
  if (maxStage && maxCount >= 5 && candidates.length) {
    const share = pct(maxCount, candidates.length);
    if (share >= 35 && maxStage !== "Joined") {
      out.push({
        icon: "🚧",
        tone: "warning",
        text: `Pipeline bottleneck at "${maxStage}": ${maxCount} candidates (${share}% of pipeline) are stuck at this stage.`,
      });
    }
  }

  // 7. Overdue interviews (scheduled in the past, not marked complete)
  const overdue = interviews.filter((i) => {
    if (!i.interview_date) return false;
    const t = new Date(i.interview_date).getTime();
    if (Number.isNaN(t)) return false;
    if (t >= Date.now()) return false;
    const status = String(i.interview_status ?? "").toLowerCase();
    return !["completed", "cancelled", "no show", "no-show"].includes(status);
  });
  if (overdue.length) {
    out.push({
      icon: "🚨",
      tone: "critical",
      text: `${overdue.length} interview${overdue.length === 1 ? " is" : "s are"} past their scheduled date without a completion status.`,
    });
  }

  // 8. Rejection rate
  const rejected = candidates.filter((c) => c.candidate_status === "Rejected").length;
  if (candidates.length >= 10) {
    const rate = pct(rejected, candidates.length);
    if (rate >= 40) {
      out.push({
        icon: "📉",
        tone: "warning",
        text: `Rejection rate is ${rate}% (${rejected} of ${candidates.length}) — consider reviewing screening criteria.`,
      });
    }
  }

  // 9. Recruiter load imbalance
  const loads: Record<string, number> = {};
  candidates.forEach((c) => {
    if (!c.recruiter) return;
    const k = String(c.recruiter);
    loads[k] = (loads[k] ?? 0) + 1;
  });
  const loadEntries = Object.entries(loads);
  if (loadEntries.length >= 2) {
    loadEntries.sort((a, b) => b[1] - a[1]);
    const [topName, topLoad] = loadEntries[0];
    const [, lowLoad] = loadEntries[loadEntries.length - 1];
    if (topLoad >= 10 && topLoad >= lowLoad * 3) {
      out.push({
        icon: "⚖️",
        tone: "neutral",
        text: `Workload imbalance: ${topName} owns ${topLoad} candidates, while the lightest recruiter has ${lowLoad}.`,
      });
    }
  }

  // 10. Joining success
  const releasedOffers = offers.length;
  const joined = offers.filter((o) => o.offer_status === "Joined").length;
  if (releasedOffers >= 5) {
    const rate = pct(joined, releasedOffers);
    out.push({
      icon: rate >= 60 ? "✅" : "📌",
      tone: rate >= 60 ? "positive" : "neutral",
      text: `Joining rate: ${rate}% of released offers (${joined} of ${releasedOffers}) have joined.`,
    });
  }

  // Fallback if nothing matched
  if (!out.length) {
    out.push({
      icon: "ℹ️",
      tone: "neutral",
      text: "Not enough data yet to surface insights. Add candidates, requisitions, interviews, and offers to see analysis.",
    });
  }

  return out;
}

/**
 * Compact JSON summary for the optional AI deep-dive.
 * Never includes PII (no names, emails, phone numbers).
 */
export function buildAiSummary(args: {
  candidates: Row[];
  requisitions: Row[];
  interviews: Row[];
  offers: Row[];
}) {
  const { candidates, requisitions, interviews, offers } = args;

  const statusBreakdown: Record<string, number> = {};
  candidates.forEach((c) => {
    const s = c.candidate_status ?? "Unknown";
    statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1;
  });

  const sourceBreakdown: Record<string, number> = {};
  candidates.forEach((c) => {
    if (!c.source) return;
    sourceBreakdown[c.source] = (sourceBreakdown[c.source] ?? 0) + 1;
  });

  const buBreakdown: Record<string, number> = {};
  candidates.forEach((c) => {
    if (!c.bu) return;
    buBreakdown[c.bu] = (buBreakdown[c.bu] ?? 0) + 1;
  });

  const reqStatus: Record<string, number> = {};
  requisitions.forEach((r) => {
    const s = r.current_status ?? "Unknown";
    reqStatus[s] = (reqStatus[s] ?? 0) + 1;
  });

  const offerStatus: Record<string, number> = {};
  offers.forEach((o) => {
    const s = o.offer_status ?? "Unknown";
    offerStatus[s] = (offerStatus[s] ?? 0) + 1;
  });

  return {
    totals: {
      candidates: candidates.length,
      requisitions: requisitions.length,
      interviews: interviews.length,
      offers: offers.length,
    },
    candidate_status: statusBreakdown,
    candidate_sources: sourceBreakdown,
    candidate_business_units: buBreakdown,
    requisition_status: reqStatus,
    offer_status: offerStatus,
    rule_based_insights: buildInsights(args).map((i) => i.text),
  };
}
