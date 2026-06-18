import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import {
  CANDIDATE_STATUS_OPTIONS,
  statusBadgeClass,
  type Candidate,
} from "@/lib/candidates";

export const Route = createFileRoute("/_authenticated/candidates/")({
  head: () => ({ meta: [{ title: "Candidates — Packfora" }] }),
  component: CandidatesPage,
});

type SearchField = "full_name" | "current_organisation" | "current_location" | "candidate_id";

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: "full_name", label: "Name" },
  { value: "current_organisation", label: "Organisation" },
  { value: "current_location", label: "Location" },
  { value: "candidate_id", label: "Candidate ID" },
];

function CandidatesPage() {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [reqOptions, setReqOptions] = useState<{ req_id: string; position_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("full_name");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Candidate[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase
      .from("requisitions")
      .select("req_id, position_name")
      .order("created_at", { ascending: false })
      .then(({ data }) => setReqOptions((data ?? []) as { req_id: string; position_name: string }[]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.candidate_status !== statusFilter) return false;
      if (!q) return true;
      const v = (r[searchField] ?? "").toString().toLowerCase();
      return v.includes(q);
    });
  }, [rows, query, searchField, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("candidates").update({ candidate_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, candidate_status: status } : r)));
    toast.success("Status updated");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Centralized candidate repository across all requisitions."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Candidate
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Select value={searchField} onValueChange={(v) => setSearchField(v as SearchField)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEARCH_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>Search by {f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search candidates…"
              className="pl-8"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CANDIDATE_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Req ID</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No candidates found.</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/candidates/$candidateId"
                      params={{ candidateId: c.candidate_id }}
                      className="text-primary hover:underline"
                    >
                      {c.candidate_id}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-xs">{c.req_id ?? "—"}</TableCell>
                  <TableCell>{c.current_organisation ?? "—"}</TableCell>
                  <TableCell>{c.current_location ?? "—"}</TableCell>
                  <TableCell>{c.experience != null ? `${c.experience} yrs` : "—"}</TableCell>
                  <TableCell>
                    <Select value={c.candidate_status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="h-8 w-[140px] border-0 p-0 shadow-none">
                        <Badge className={statusBadgeClass(c.candidate_status)} variant="secondary">
                          {c.candidate_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {CANDIDATE_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CandidateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        reqOptions={reqOptions}
        onSaved={load}
      />
    </div>
  );
}
