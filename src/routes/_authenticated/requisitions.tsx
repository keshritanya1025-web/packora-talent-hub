import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { RequisitionForm } from "@/components/requisitions/RequisitionForm";
import {
  exportRequisitionsCsv,
  STATUS_OPTIONS,
  type Requisition,
} from "@/lib/requisitions";

export const Route = createFileRoute("/_authenticated/requisitions")({
  head: () => ({ meta: [{ title: "Requisitions — Packfora" }] }),
  component: RequisitionsPage,
});

type SortKey = keyof Requisition;
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

function RequisitionsPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: async (): Promise<Requisition[]> => {
      const { data, error } = await supabase
        .from("requisitions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Requisition[];
    },
  });

  // Filters
  const [fBU, setFBU] = useState("");
  const [fRecruiter, setFRecruiter] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fLevel, setFLevel] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [search, setSearch] = useState("");

  // Sorting + paging
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // Form + delete state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [deleting, setDeleting] = useState<Requisition | null>(null);

  const uniq = (key: keyof Requisition) =>
    Array.from(new Set(rows.map((r) => (r[key] ?? "") as string).filter(Boolean))).sort();

  const buOptions = useMemo(() => uniq("bu"), [rows]);
  const recruiterOptions = useMemo(() => uniq("recruiter"), [rows]);
  const locationOptions = useMemo(() => uniq("location"), [rows]);
  const levelOptions = useMemo(() => uniq("position_level"), [rows]);
  const countryOptions = useMemo(() => uniq("country"), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (fBU && r.bu !== fBU) return false;
      if (fRecruiter && r.recruiter !== fRecruiter) return false;
      if (fLocation && r.location !== fLocation) return false;
      if (fLevel && r.position_level !== fLevel) return false;
      if (fStatus && r.current_status !== fStatus) return false;
      if (fCountry && r.country !== fCountry) return false;
      if (q) {
        const hay = [r.position_name, r.req_id, r.hiring_manager, r.client_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, fBU, fRecruiter, fLocation, fLevel, fStatus, fCountry, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const clearFilters = () => {
    setFBU(""); setFRecruiter(""); setFLocation(""); setFLevel(""); setFStatus(""); setFCountry(""); setSearch("");
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("requisitions").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success(`${deleting.req_id} deleted`);
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ["requisitions"] });
  };

  const updateStatus = async (r: Requisition, status: string) => {
    const { error } = await supabase.from("requisitions").update({ current_status: status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Status updated to ${status}`);
    qc.invalidateQueries({ queryKey: ["requisitions"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisitions"
        description="Manage open roles, hiring managers, and approval status."
        actions={
          <>
            <Button variant="outline" onClick={() => exportRequisitionsCsv(sorted)} disabled={sorted.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Requisition
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <FilterSelect label="Business Unit" value={fBU} onChange={setFBU} options={buOptions} />
          <FilterSelect label="Recruiter" value={fRecruiter} onChange={setFRecruiter} options={recruiterOptions} />
          <FilterSelect label="Location" value={fLocation} onChange={setFLocation} options={locationOptions} />
          <FilterSelect label="Level" value={fLevel} onChange={setFLevel} options={levelOptions} />
          <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={[...STATUS_OPTIONS]} />
          <FilterSelect label="Country" value={fCountry} onChange={setFCountry} options={countryOptions} />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by Job Name, Req ID, Hiring Manager, or Client Name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" /> Clear
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Req ID" sortKey="req_id" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Position" sortKey="position_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="BU" sortKey="bu" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Location" sortKey="location" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Level" sortKey="position_level" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Hiring Manager" sortKey="hiring_manager" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Client" sortKey="client_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Recruiter" sortKey="recruiter" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHead label="Priority" sortKey="priority" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">Loading requisitions…</TableCell></TableRow>
              )}
              {!isLoading && pageRows.length === 0 && (
                <TableRow><TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">No requisitions match your filters.</TableCell></TableRow>
              )}
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.req_id}</TableCell>
                  <TableCell className="font-medium">{r.position_name}</TableCell>
                  <TableCell>{r.bu ?? "—"}</TableCell>
                  <TableCell>{r.location ?? "—"}</TableCell>
                  <TableCell>{r.position_level ?? "—"}</TableCell>
                  <TableCell>{r.hiring_manager ?? "—"}</TableCell>
                  <TableCell>{r.client_name ?? "—"}</TableCell>
                  <TableCell>{r.recruiter ?? "—"}</TableCell>
                  <TableCell>
                    {r.priority ? <Badge variant="secondary">{r.priority}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <Select value={r.current_status} onValueChange={(v) => updateStatus(r, v)}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm sm:flex-row">
          <p className="text-muted-foreground">
            Showing {pageRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {(page - 1) * PAGE_SIZE + pageRows.length} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <RequisitionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["requisitions"] })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete requisition?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono">{deleting?.req_id}</span> ({deleting?.position_name}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SortableHead({ label, sortKey, current, dir, onClick }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onClick: (k: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <TableHead>
      <button onClick={() => onClick(sortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/50"}`} />
        {active && <span className="text-[10px] text-muted-foreground">{dir}</span>}
      </button>
    </TableHead>
  );
}
