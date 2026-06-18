import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Search, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InterviewForm } from "@/components/interviews/InterviewForm";
import {
  INTERVIEW_STATUS_OPTIONS,
  feedbackBadgeClass,
  roundCompleted,
  statusBadgeClass,
  type Interview,
} from "@/lib/interviews";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({ meta: [{ title: "Interviews — Packfora" }] }),
  component: InterviewsPage,
});

type CandidateOption = {
  candidate_id: string;
  full_name: string;
  req_id: string | null;
  bu: string | null;
  job_level: string | null;
  job_name: string | null;
  recruiter: string | null;
};

function InterviewsPage() {
  const [rows, setRows] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Interview | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Interview[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase
      .from("candidates")
      .select("candidate_id, full_name, req_id, bu, job_level, job_name, recruiter")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCandidates((data ?? []) as CandidateOption[]));
  }, []);

  const metrics = useMemo(() => {
    const r1 = rows.filter((r) => roundCompleted(r.r1_date, r.r1_feedback)).length;
    const r2 = rows.filter((r) => roundCompleted(r.r2_date, r.r2_feedback)).length;
    const r3 = rows.filter((r) => roundCompleted(r.r3_date, r.r3_feedback)).length;
    const selected = rows.filter((r) => r.interview_status === "Selected").length;
    const conversion = rows.length > 0 ? Math.round((selected / rows.length) * 100) : 0;
    return { total: rows.length, r1, r2, r3, selected, conversion };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.interview_status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.candidate_name ?? "").toLowerCase().includes(q) ||
        (r.candidate_id ?? "").toLowerCase().includes(q) ||
        (r.interview_id ?? "").toLowerCase().includes(q) ||
        (r.req_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("interviews").update({ interview_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, interview_status: status } : r)));
    toast.success("Status updated");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Track multi-round interview pipeline and panel feedback."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Log Interview
          </Button>
        }
      />

      {/* Dashboard metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Metric icon={<Users className="h-4 w-4" />} label="Total" value={metrics.total} />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="R1 Completed" value={metrics.r1} />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="R2 Completed" value={metrics.r2} />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="R3 Completed" value={metrics.r3} />
        <Metric icon={<TrendingUp className="h-4 w-4" />} label="Conversion" value={`${metrics.conversion}%`} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by candidate, interview ID, req ID…"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INTERVIEW_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interview ID</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Req / Job</TableHead>
              <TableHead>R1</TableHead>
              <TableHead>R2</TableHead>
              <TableHead>R3</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No interviews logged yet.</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.interview_id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.candidate_name ?? r.candidate_id}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.candidate_id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono">{r.req_id ?? "—"}</div>
                    <div className="text-sm">{r.job_name ?? "—"}</div>
                  </TableCell>
                  <RoundCell date={r.r1_date} feedback={r.r1_feedback} />
                  <RoundCell date={r.r2_date} feedback={r.r2_feedback} />
                  <RoundCell date={r.r3_date} feedback={r.r3_feedback} />
                  <TableCell>
                    <Select value={r.interview_status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="h-8 w-[140px] border-0 p-0 shadow-none">
                        <Badge className={statusBadgeClass(r.interview_status)} variant="secondary">
                          {r.interview_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVIEW_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InterviewForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        candidateOptions={candidates}
        onSaved={load}
      />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function RoundCell({ date, feedback }: { date: string | null; feedback: string | null }) {
  if (!date && !feedback) {
    return <TableCell className="text-muted-foreground">—</TableCell>;
  }
  return (
    <TableCell>
      <div className="text-xs">{date ?? "—"}</div>
      {feedback && (
        <Badge className={`mt-1 ${feedbackBadgeClass(feedback)}`} variant="secondary">{feedback}</Badge>
      )}
    </TableCell>
  );
}
