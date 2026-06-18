import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Linkedin, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import {
  CANDIDATE_STATUS_OPTIONS,
  statusBadgeClass,
  type Candidate,
} from "@/lib/candidates";

export const Route = createFileRoute("/_authenticated/candidates/$candidateId")({
  head: () => ({ meta: [{ title: "Candidate Profile — Packfora" }] }),
  component: CandidateProfilePage,
});

function CandidateProfilePage() {
  const { candidateId } = Route.useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reqOptions, setReqOptions] = useState<{ req_id: string; position_name: string }[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (error) toast.error(error.message);
    setCandidate((data as Candidate | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase
      .from("requisitions")
      .select("req_id, position_name")
      .then(({ data }) => setReqOptions((data ?? []) as { req_id: string; position_name: string }[]));
  }, [candidateId]);

  const updateStatus = async (status: string) => {
    if (!candidate) return;
    const { error } = await supabase.from("candidates").update({ candidate_status: status }).eq("id", candidate.id);
    if (error) return toast.error(error.message);
    setCandidate({ ...candidate, candidate_status: status });
    toast.success("Status updated");
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading candidate…</div>;
  }
  if (!candidate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Candidate not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/candidates" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to candidates
        </Link>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />Edit
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {initials(candidate.full_name)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{candidate.full_name}</h1>
              <p className="font-mono text-xs text-muted-foreground">{candidate.candidate_id}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {candidate.email_address && (
                  <a href={`mailto:${candidate.email_address}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" />{candidate.email_address}
                  </a>
                )}
                {candidate.mobile_number && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{candidate.mobile_number}</span>
                )}
                {candidate.linkedin_url && (
                  <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                    <Linkedin className="h-3.5 w-3.5" />LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusBadgeClass(candidate.candidate_status)} variant="secondary">
              {candidate.candidate_status}
            </Badge>
            <Select value={candidate.candidate_status} onValueChange={updateStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANDIDATE_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Requisition">
          <Row label="Req ID" value={candidate.req_id} mono />
          <Row label="Job Name" value={candidate.job_name} />
          <Row label="Client Name" value={candidate.client_name} />
          <Row label="BU" value={candidate.bu} />
          <Row label="Job Level" value={candidate.job_level} />
          <Row label="Expertise" value={candidate.expertise} />
          <Row label="FY" value={candidate.fy} />
          <Row label="Recruiter" value={candidate.recruiter} />
        </Section>

        <Section title="Personal">
          <Row label="First Name" value={candidate.first_name} />
          <Row label="Last Name" value={candidate.last_name} />
          <Row label="Gender" value={candidate.gender} />
          <Row label="Current Location" value={candidate.current_location} />
          <Row label="Country" value={candidate.country} />
          <Row label="Location (Job)" value={candidate.location} />
        </Section>

        <Section title="Professional">
          <Row label="Current Organisation" value={candidate.current_organisation} />
          <Row label="Experience" value={candidate.experience != null ? `${candidate.experience} yrs` : null} />
          <Row label="Industry Background" value={candidate.industry_background} />
          <Row label="Education" value={candidate.education} />
          <Row label="Passout Year" value={candidate.passout_year} />
          <Row label="Notice Period" value={candidate.notice_period} />
        </Section>

        <Section title="Compensation & Source">
          <Row label="Current CTC" value={candidate.current_ctc} />
          <Row label="Expected CTC" value={candidate.expected_ctc} />
          <Row label="Source" value={candidate.source} />
          <Row label="Source Name" value={candidate.source_name} />
          <Row label="Portal Name" value={candidate.portal_name} />
        </Section>

        <Section title="Notes" className="md:col-span-2">
          <Row label="Recruiter Remarks" value={candidate.recruiter_remarks} block />
          <Row label="Rejection Reason" value={candidate.rejection_reason} block />
        </Section>
      </div>

      <CandidateForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={candidate}
        reqOptions={reqOptions}
        onSaved={load}
      />
    </div>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border bg-card p-5 ${className ?? ""}`}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, block }: { label: string; value: React.ReactNode; mono?: boolean; block?: boolean }) {
  const v = value === null || value === undefined || value === "" ? "—" : value;
  if (block) {
    return (
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{v}</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{v}</span>
    </div>
  );
}
