import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Search, FileDown, Trash2, Users, CheckCircle2, XCircle, UserCheck, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferForm } from "@/components/offers/OfferForm";
import { OFFER_STATUS_OPTIONS, exportOffersCsv, offerStatusBadgeClass, type Offer } from "@/lib/offers";

export const Route = createFileRoute("/_authenticated/offers")({
  head: () => ({ meta: [{ title: "Offers — Packfora" }] }),
  component: OffersPage,
});

type CandidateOption = {
  candidate_id: string;
  full_name: string;
  req_id: string | null;
  job_name: string | null;
  recruiter: string | null;
};

function OffersPage() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Offer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Offer[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase
      .from("candidates")
      .select("candidate_id, full_name, req_id, job_name, recruiter")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCandidates((data ?? []) as CandidateOption[]));
  }, []);

  const metrics = useMemo(() => {
    const total = rows.length;
    const accepted = rows.filter((r) => r.offer_status === "Accepted").length;
    const declined = rows.filter((r) => r.offer_status === "Declined").length;
    const joined = rows.filter((r) => r.offer_status === "Joined").length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const joinConversion = total > 0 ? Math.round((joined / total) * 100) : 0;
    return { total, accepted, declined, joined, acceptanceRate, joinConversion };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.offer_status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.candidate_name ?? "").toLowerCase().includes(q) ||
        (r.offer_id ?? "").toLowerCase().includes(q) ||
        (r.req_id ?? "").toLowerCase().includes(q) ||
        (r.position_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("offers").update({ offer_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, offer_status: status } : r)));
    toast.success("Status updated");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("offers").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== deleteId));
    toast.success("Offer deleted");
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers & Joining"
        description="Track offer letters, acceptances, and candidate joinings."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportOffersCsv(filtered)}>
              <FileDown className="mr-2 h-4 w-4" />Export CSV
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Release Offer
            </Button>
          </div>
        }
      />

      {/* Dashboard metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Metric icon={<Users className="h-4 w-4" />} label="Total Offers" value={metrics.total} />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Accepted" value={metrics.accepted} />
        <Metric icon={<XCircle className="h-4 w-4" />} label="Declined" value={metrics.declined} />
        <Metric icon={<UserCheck className="h-4 w-4" />} label="Joined" value={metrics.joined} />
        <Metric icon={<TrendingUp className="h-4 w-4" />} label="Acceptance Rate" value={`${metrics.acceptanceRate}%`} />
        <Metric icon={<TrendingUp className="h-4 w-4" />} label="Join Conversion" value={`${metrics.joinConversion}%`} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by candidate, offer ID, req ID, position…"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {OFFER_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer ID</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Req / Position</TableHead>
              <TableHead>Recruiter</TableHead>
              <TableHead>Released</TableHead>
              <TableHead>Accepted</TableHead>
              <TableHead>Joining</TableHead>
              <TableHead>CTC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">No offers yet.</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.offer_id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.candidate_name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.candidate_id ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono">{r.req_id ?? "—"}</div>
                    <div className="text-sm">{r.position_name ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.recruiter ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.offer_released_date ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.offer_accepted_date ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.joining_date ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{r.ctc_offered ? `₹${Number(r.ctc_offered).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    <Select value={r.offer_status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="h-8 w-[130px] border-0 p-0 shadow-none">
                        <Badge className={offerStatusBadgeClass(r.offer_status)} variant="secondary">
                          {r.offer_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OfferForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        candidateOptions={candidates}
        onSaved={load}
      />

      {deleteId && (
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          onConfirm={handleDelete}
          title="Delete Offer"
          description="Are you sure you want to delete this offer? This action cannot be undone."
        />
      )}
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

function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

