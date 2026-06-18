import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CANDIDATE_STATUS_OPTIONS,
  EMPTY_CANDIDATE,
  GENDER_OPTIONS,
  normalizeCandidateForDb,
  type Candidate,
  type CandidateInput,
} from "@/lib/candidates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Candidate | null;
  reqOptions?: { req_id: string; position_name: string }[];
  onSaved: () => void;
}

export function CandidateForm({ open, onOpenChange, initial, reqOptions = [], onSaved }: Props) {
  const [form, setForm] = useState<CandidateInput>(EMPTY_CANDIDATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id: _i, candidate_id: _c, created_at: _ca, updated_at: _u, ...rest } = initial;
      setForm(rest as CandidateInput);
    } else {
      setForm(EMPTY_CANDIDATE);
    }
  }, [initial, open]);

  const set = <K extends keyof CandidateInput>(k: K, v: CandidateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string): number | null => (v === "" ? null : Number(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name?.trim()) {
      toast.error("Full Name is required");
      return;
    }
    setSaving(true);
    const payload = normalizeCandidateForDb(form);

    let error;
    if (initial) {
      ({ error } = await supabase.from("candidates").update(payload as never).eq("id", initial.id));
    } else {
      // Generate candidate_id via RPC
      const { data: cid, error: idErr } = await supabase.rpc("generate_candidate_id", {
        _full_name: form.full_name,
      });
      if (idErr) {
        setSaving(false);
        return toast.error(idErr.message);
      }
      payload.candidate_id = cid;
      const { data: userData } = await supabase.auth.getUser();
      payload.created_by = userData.user?.id ?? null;
      ({ error } = await supabase.from("candidates").insert(payload as never));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Candidate updated" : "Candidate added");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.candidate_id}` : "Add Candidate"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update candidate details." : "Candidate ID is auto-generated on save."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Full Name *">
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
              </Field>
              <Field label="First Name">
                <Input value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
              </Field>
              <Field label="Last Name">
                <Input value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} />
              </Field>
              <SelectField label="Gender" value={form.gender ?? ""} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} />
              <Field label="Email Address">
                <Input type="email" value={form.email_address ?? ""} onChange={(e) => set("email_address", e.target.value)} />
              </Field>
              <Field label="Mobile Number">
                <Input value={form.mobile_number ?? ""} onChange={(e) => set("mobile_number", e.target.value)} />
              </Field>
              <Field label="LinkedIn URL">
                <Input value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" />
              </Field>

              <Field label="Req ID">
                <Select value={form.req_id || undefined} onValueChange={(v) => set("req_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Link to requisition…" /></SelectTrigger>
                  <SelectContent>
                    {reqOptions.map((r) => (
                      <SelectItem key={r.req_id} value={r.req_id}>
                        {r.req_id} — {r.position_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Job Name">
                <Input value={form.job_name ?? ""} onChange={(e) => set("job_name", e.target.value)} />
              </Field>
              <Field label="FY">
                <Input value={form.fy ?? ""} onChange={(e) => set("fy", e.target.value)} placeholder="FY25-26" />
              </Field>
              <Field label="BU">
                <Input value={form.bu ?? ""} onChange={(e) => set("bu", e.target.value)} />
              </Field>
              <Field label="Job Level">
                <Input value={form.job_level ?? ""} onChange={(e) => set("job_level", e.target.value)} />
              </Field>
              <Field label="Expertise">
                <Input value={form.expertise ?? ""} onChange={(e) => set("expertise", e.target.value)} />
              </Field>
              <Field label="Client Name">
                <Input value={form.client_name ?? ""} onChange={(e) => set("client_name", e.target.value)} />
              </Field>
              <Field label="Country">
                <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
              </Field>
              <Field label="Location">
                <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Recruiter">
                <Input value={form.recruiter ?? ""} onChange={(e) => set("recruiter", e.target.value)} />
              </Field>
              <SelectField label="Candidate Status" value={form.candidate_status} onChange={(v) => set("candidate_status", v)} options={CANDIDATE_STATUS_OPTIONS} />

              <Field label="Current Location">
                <Input value={form.current_location ?? ""} onChange={(e) => set("current_location", e.target.value)} />
              </Field>
              <Field label="Education">
                <Input value={form.education ?? ""} onChange={(e) => set("education", e.target.value)} />
              </Field>
              <Field label="Passout Year">
                <Input type="number" value={form.passout_year ?? ""} onChange={(e) => set("passout_year", num(e.target.value))} />
              </Field>
              <Field label="Current Organisation">
                <Input value={form.current_organisation ?? ""} onChange={(e) => set("current_organisation", e.target.value)} />
              </Field>
              <Field label="Experience (yrs)">
                <Input type="number" step="0.1" value={form.experience ?? ""} onChange={(e) => set("experience", num(e.target.value))} />
              </Field>
              <Field label="Notice Period">
                <Input value={form.notice_period ?? ""} onChange={(e) => set("notice_period", e.target.value)} />
              </Field>
              <Field label="Source">
                <Input value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} />
              </Field>
              <Field label="Source Name">
                <Input value={form.source_name ?? ""} onChange={(e) => set("source_name", e.target.value)} />
              </Field>
              <Field label="Portal Name">
                <Input value={form.portal_name ?? ""} onChange={(e) => set("portal_name", e.target.value)} />
              </Field>
              <Field label="Current CTC">
                <Input type="number" step="0.01" value={form.current_ctc ?? ""} onChange={(e) => set("current_ctc", num(e.target.value))} />
              </Field>
              <Field label="Expected CTC">
                <Input type="number" step="0.01" value={form.expected_ctc ?? ""} onChange={(e) => set("expected_ctc", num(e.target.value))} />
              </Field>
              <Field label="Industry Background">
                <Input value={form.industry_background ?? ""} onChange={(e) => set("industry_background", e.target.value)} />
              </Field>
              <Field label="Rejection Reason" className="md:col-span-2 lg:col-span-3">
                <Textarea value={form.rejection_reason ?? ""} onChange={(e) => set("rejection_reason", e.target.value)} rows={2} />
              </Field>
              <Field label="Recruiter Remarks" className="md:col-span-2 lg:col-span-3">
                <Textarea value={form.recruiter_remarks ?? ""} onChange={(e) => set("recruiter_remarks", e.target.value)} rows={2} />
              </Field>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Add Candidate"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <Field label={label}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}
