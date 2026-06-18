import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Users, CalendarDays, FileCheck2, UserPlus, UserCheck, RefreshCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { EmptyChartAi } from "@/components/dashboard/EmptyChartAi";
import { buildAiSummary } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Executive Dashboard — Packfora" }] }),
  component: ExecutiveDashboard,
});

const ALL = "__all__";
const COLORS = ["#1e3a8a", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];
const PIPELINE_STATUSES = ["Applied", "Shortlisted", "Interviewed", "Offered", "Joined", "On Hold", "Rejected"] as const;

type Row = Record<string, any>;

function useTableAll(table: "requisitions" | "candidates" | "interviews" | "offers") {
  return useQuery({
    queryKey: [table, "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").limit(10000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function uniq(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

interface Filters {
  bu: string;
  fy: string;
  recruiter: string;
  location: string;
  source: string;
  level: string;
}

const EMPTY_FILTERS: Filters = { bu: ALL, fy: ALL, recruiter: ALL, location: ALL, source: ALL, level: ALL };

function matches(row: Row, f: Filters, kind: "req" | "cand"): boolean {
  if (f.bu !== ALL && row.bu !== f.bu) return false;
  if (f.fy !== ALL && row.fy !== f.fy) return false;
  if (f.recruiter !== ALL && row.recruiter !== f.recruiter) return false;
  if (f.source !== ALL && row.source !== f.source) return false;
  if (kind === "req") {
    if (f.location !== ALL && row.location !== f.location) return false;
    if (f.level !== ALL && row.position_level !== f.level) return false;
  } else {
    if (f.location !== ALL && row.location !== f.location && row.current_location !== f.location) return false;
    if (f.level !== ALL && row.job_level !== f.level) return false;
  }
  return true;
}

function ExecutiveDashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const reqsQ = useTableAll("requisitions");
  const candsQ = useTableAll("candidates");
  const intsQ = useTableAll("interviews");
  const offersQ = useTableAll("offers");

  const loading = reqsQ.isLoading || candsQ.isLoading || intsQ.isLoading || offersQ.isLoading;

  const allReqs = reqsQ.data ?? [];
  const allCands = candsQ.data ?? [];
  const allInts = intsQ.data ?? [];
  const allOffers = offersQ.data ?? [];

  // Filter options aggregated across data
  const opts = useMemo(() => {
    return {
      bu: uniq([...allReqs.map((r) => r.bu), ...allCands.map((c) => c.bu)]),
      fy: uniq([...allReqs.map((r) => r.fy), ...allCands.map((c) => c.fy)]),
      recruiter: uniq([...allReqs.map((r) => r.recruiter), ...allCands.map((c) => c.recruiter)]),
      location: uniq([
        ...allReqs.map((r) => r.location),
        ...allCands.map((c) => c.location),
        ...allCands.map((c) => c.current_location),
      ]),
      source: uniq([...allReqs.map((r) => r.source), ...allCands.map((c) => c.source)]),
      level: uniq([...allReqs.map((r) => r.position_level), ...allCands.map((c) => c.job_level)]),
    };
  }, [allReqs, allCands]);

  // Apply filters
  const reqs = useMemo(() => allReqs.filter((r) => matches(r, filters, "req")), [allReqs, filters]);
  const cands = useMemo(() => allCands.filter((c) => matches(c, filters, "cand")), [allCands, filters]);
  const candIds = useMemo(() => new Set(cands.map((c) => c.candidate_id)), [cands]);
  const reqIds = useMemo(() => new Set(reqs.map((r) => r.req_id)), [reqs]);
  const ints = useMemo(
    () => allInts.filter((i) => candIds.has(i.candidate_id) || reqIds.has(i.req_id)),
    [allInts, candIds, reqIds],
  );
  const offers = useMemo(
    () => allOffers.filter((o) => candIds.has(o.candidate_id) || reqIds.has(o.req_id)),
    [allOffers, candIds, reqIds],
  );

  // KPIs
  const kpis = useMemo(() => {
    const by = (s: string) => cands.filter((c) => c.candidate_status === s).length;
    return {
      pipeline: cands.length,
      shortlisted: by("Shortlisted"),
      interviewed: by("Interviewed"),
      offered: by("Offered") + offers.length,
      joined: by("Joined"),
      openReqs: reqs.filter((r) => (r.current_status ?? "").toLowerCase() === "open").length,
    };
  }, [cands, offers, reqs]);

  // 1. Funnel
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {
      Applied: 0, Shortlisted: 0, Interviewed: 0, Offered: 0, Joined: 0,
    };
    cands.forEach((c) => {
      const order = ["Applied", "Shortlisted", "Interviewed", "Offered", "Joined"];
      const idx = order.indexOf(c.candidate_status);
      if (idx >= 0) for (let i = 0; i <= idx; i++) counts[order[i]]++;
    });
    return ["Applied", "Shortlisted", "Interviewed", "Offered", "Joined"].map((name, i) => ({
      name, value: counts[name], fill: COLORS[i],
    }));
  }, [cands]);

  // 2. Pipeline status donut
  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    PIPELINE_STATUSES.forEach((s) => (map[s] = 0));
    cands.forEach((c) => { if (c.candidate_status in map) map[c.candidate_status]++; });
    return Object.entries(map).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [cands]);

  // 3. Pipeline by BU
  const pipelineByBU = useMemo(() => {
    const m: Record<string, number> = {};
    cands.forEach((c) => { if (!c.bu) return; const k = String(c.bu); m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([bu, count]) => ({ bu, count })).sort((a, b) => b.count - a.count);
  }, [cands]);

  // 4. Source distribution
  const sourceDist = useMemo(() => {
    const m: Record<string, number> = {};
    cands.forEach((c) => { if (!c.source) return; const k = String(c.source); m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [cands]);

  // 5. Recruiter performance
  const recruiterPerf = useMemo(() => {
    const m: Record<string, { recruiter: string; pipeline: number; joined: number }> = {};
    cands.forEach((c) => {
      if (!c.recruiter) return;
      const k = String(c.recruiter);
      if (!m[k]) m[k] = { recruiter: k, pipeline: 0, joined: 0 };
      m[k].pipeline++;
      if (c.candidate_status === "Joined") m[k].joined++;
    });
    return Object.values(m).sort((a, b) => b.pipeline - a.pipeline).slice(0, 10);
  }, [cands]);

  // 6. Job level distribution
  const levelDist = useMemo(() => {
    const m: Record<string, number> = {};
    reqs.forEach((r) => { if (!r.position_level) return; const k = String(r.position_level); m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([level, count]) => ({ level, count }));
  }, [reqs]);

  // 7. Open requisition aging
  const aging = useMemo(() => {
    const buckets = { "0–15d": 0, "16–30d": 0, "31–60d": 0, "61–90d": 0, "90+d": 0 };
    const now = Date.now();
    reqs
      .filter((r) => (r.current_status ?? "").toLowerCase() === "open")
      .forEach((r) => {
        const d = r.date_of_request ? new Date(r.date_of_request).getTime() : now;
        const days = Math.floor((now - d) / 86400000);
        const k = days <= 15 ? "0–15d" : days <= 30 ? "16–30d" : days <= 60 ? "31–60d" : days <= 90 ? "61–90d" : "90+d";
        (buckets as any)[k]++;
      });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [reqs]);

  // 8. Interview activity by BU
  const intByBU = useMemo(() => {
    const m: Record<string, number> = {};
    ints.forEach((i) => { if (!i.bu) return; const k = String(i.bu); m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([bu, count]) => ({ bu, count })).sort((a, b) => b.count - a.count);
  }, [ints]);

  // 9. Offer acceptance rate
  const offerAcceptance = useMemo(() => {
    const released = offers.length;
    const accepted = offers.filter((o) => ["Accepted", "Joined"].includes(o.offer_status)).length;
    const declined = offers.filter((o) => o.offer_status === "Declined").length;
    const pending = released - accepted - declined;
    return [
      { name: "Accepted", value: accepted, fill: "#10b981" },
      { name: "Declined", value: declined, fill: "#ef4444" },
      { name: "Pending", value: Math.max(0, pending), fill: "#f59e0b" },
    ];
  }, [offers]);

  const acceptanceRate = useMemo(() => {
    const total = offers.length || 1;
    const a = offers.filter((o) => ["Accepted", "Joined"].includes(o.offer_status)).length;
    return Math.round((a / total) * 100);
  }, [offers]);

  // 10. Joining rate
  const joinRate = useMemo(() => {
    const accepted = offers.filter((o) => ["Accepted", "Joined"].includes(o.offer_status)).length || 1;
    const joined = offers.filter((o) => o.offer_status === "Joined").length;
    return Math.round((joined / accepted) * 100);
  }, [offers]);

  // 11. Monthly hiring trend
  const monthlyHiring = useMemo(() => {
    const m: Record<string, { month: string; joined: number; offered: number }> = {};
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    offers.forEach((o) => {
      if (o.joining_date) {
        const k = fmt(new Date(o.joining_date));
        if (!m[k]) m[k] = { month: k, joined: 0, offered: 0 };
        if (o.offer_status === "Joined") m[k].joined++;
      }
      if (o.offer_released_date) {
        const k = fmt(new Date(o.offer_released_date));
        if (!m[k]) m[k] = { month: k, joined: 0, offered: 0 };
        m[k].offered++;
      }
    });
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [offers]);

  // 12. Candidate location distribution
  const locationDist = useMemo(() => {
    const m: Record<string, number> = {};
    cands.forEach((c) => { const k = c.current_location ?? c.location; if (!k) return; m[String(k)] = (m[String(k)] ?? 0) + 1; });
    return Object.entries(m).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [cands]);

  const refetchAll = () => {
    reqsQ.refetch(); candsQ.refetch(); intsQ.refetch(); offersQ.refetch();
  };

  const aiSummary = useMemo(
    () => buildAiSummary({ candidates: cands, requisitions: reqs, interviews: ints, offers }),
    [cands, reqs, ints, offers],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Real-time talent acquisition KPIs and pipeline analytics."
        actions={
          <>
            <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>Reset filters</Button>
            <Button variant="outline" onClick={refetchAll}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Global filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <FilterSelect label="BU" value={filters.bu} options={opts.bu} onChange={(v) => setFilters({ ...filters, bu: v })} />
            <FilterSelect label="FY" value={filters.fy} options={opts.fy} onChange={(v) => setFilters({ ...filters, fy: v })} />
            <FilterSelect label="Recruiter" value={filters.recruiter} options={opts.recruiter} onChange={(v) => setFilters({ ...filters, recruiter: v })} />
            <FilterSelect label="Location" value={filters.location} options={opts.location} onChange={(v) => setFilters({ ...filters, location: v })} />
            <FilterSelect label="Source" value={filters.source} options={opts.source} onChange={(v) => setFilters({ ...filters, source: v })} />
            <FilterSelect label="Level" value={filters.level} options={opts.level} onChange={(v) => setFilters({ ...filters, level: v })} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Pipeline" value={kpis.pipeline} icon={Users} tone="blue" />
        <Kpi label="Shortlisted" value={kpis.shortlisted} icon={UserCheck} tone="cyan" />
        <Kpi label="Interviewed" value={kpis.interviewed} icon={CalendarDays} tone="violet" />
        <Kpi label="Offers" value={kpis.offered} icon={FileCheck2} tone="amber" />
        <Kpi label="Joined" value={kpis.joined} icon={UserPlus} tone="green" />
        <Kpi label="Open Requisitions" value={kpis.openReqs} icon={Briefcase} tone="slate" />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading analytics…</p>}

      {/* Insights — automatic interpretation of the data */}
      {!loading && (
        <InsightsPanel
          candidates={cands}
          requisitions={reqs}
          interviews={ints}
          offers={offers}
        />
      )}

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Recruitment Funnel" subtitle="Applied → Joined" empty={funnelData.every((d) => d.value === 0)} dimension="pipeline stage" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#0f172a" stroke="none" dataKey="name" />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline Status" empty={donutData.every((d) => d.value === 0)} dimension="candidate status" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline by Business Unit" empty={pipelineByBU.length === 0} dimension="business unit" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineByBU}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bu" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Source Distribution" empty={sourceDist.length === 0} dimension="source" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sourceDist} dataKey="value" nameKey="name" outerRadius={100} label>
                {sourceDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recruiter Performance" subtitle="Top 10 by pipeline" empty={recruiterPerf.length === 0} dimension="recruiter" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recruiterPerf} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="recruiter" width={110} tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Bar dataKey="pipeline" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              <Bar dataKey="joined" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Job Level Distribution" empty={levelDist.length === 0} dimension="job level" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={levelDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open Requisition Aging" empty={aging.every((d) => d.count === 0)} dimension="days open bucket" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aging}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Interview Activity by BU" empty={intByBU.length === 0} dimension="business unit" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intByBU}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bu" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Offer Acceptance Rate" subtitle={`${acceptanceRate}% accepted`} empty={offers.length === 0} dimension="offer status" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={offerAcceptance} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                {offerAcceptance.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Joining Rate" subtitle={`${joinRate}% of accepted offers joined`} empty={offers.length === 0} dimension="offer status" summary={aiSummary}>
          <div className="flex h-[300px] flex-col items-center justify-center">
            <div className="text-7xl font-bold text-emerald-600">{joinRate}%</div>
            <p className="mt-3 text-sm text-muted-foreground">
              {offers.filter((o) => o.offer_status === "Joined").length} joined of{" "}
              {offers.filter((o) => ["Accepted", "Joined"].includes(o.offer_status)).length} accepted offers
            </p>
          </div>
        </ChartCard>

        <ChartCard title="Monthly Hiring Trend" subtitle="Last 12 months" empty={monthlyHiring.length === 0} dimension="calendar month" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyHiring}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="offered" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="joined" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Candidate Location Distribution" subtitle="Top 10 cities" empty={locationDist.length === 0} dimension="city" summary={aiSummary}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationDist} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="location" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder={`All ${label}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All {label}</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

const TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  cyan: "bg-cyan-50 text-cyan-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
};

function Kpi({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: keyof typeof TONES }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`rounded-md p-1.5 ${TONES[tone]}`}><Icon className="h-4 w-4" /></div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title, subtitle, empty, dimension, summary, children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  dimension?: string;
  summary?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {subtitle && <Badge variant="outline" className="text-xs font-normal">{subtitle}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          dimension && summary ? (
            <EmptyChartAi chartTitle={title} expectedDimension={dimension} summary={summary} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              No data available for this view
            </div>
          )
        ) : children}
      </CardContent>
    </Card>
  );
}
