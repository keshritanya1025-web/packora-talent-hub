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
  EMPTY_INTERVIEW,
  FEEDBACK_OPTIONS,
  INTERVIEW_STATUS_OPTIONS,
  normalizeInterviewForDb,
  type Interview,
  type InterviewInput,
} from "@/lib/interviews";

type CandidateOption = {
  candidate_id: string;
  full_name: string;
  req_id: string | null;
  bu: string | null;
  job_level: string | null;
  job_name: string | null;
  recruiter: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Interview | null;
  candidateOptions: CandidateOption[];
  onSaved: () => void;
}

export function InterviewForm({ open, onOpenChange, initial, candidateOptions, onSaved }: Props) {
  const [form, setForm] = useState<InterviewInput>(EMPTY_INTERVIEW);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id: _i, interview_id: _x, created_at: _c, updated_at: _u, ...rest } = initial;
      setForm(rest as InterviewInput);
    } else {
      setForm(EMPTY_INTERVIEW);
    }
  }, [initial, open]);

  const set = <K extends keyof InterviewInput>(k: K, v: InterviewInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleCandidateChange = (candidateId: string) => {
    const c = candidateOptions.find((c) => c.candidate_id === candidateId);
    setForm((f) => ({
      ...f,
      candidate_id: candidateId,
      candidate_name: c?.full_name ?? f.candidate_name,
      req_id: c?.req_id ?? f.req_id,
      bu: c?.bu ?? f.bu,
      job_level: c?.job_level ?? f.job_level,
      job_name: c?.job_name ?? f.job_name,
      recruiter: c?.recruiter ?? f.recruiter,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidate_id) {
      toast.error("Candidate is required");
      return;
    }
    setSaving(true);
    const payload = normalizeInterviewForDb(form);

    let error;
    if (initial) {
      ({ error } = await supabase.from("interviews").update(payload as never).eq("id", initial.id));
    } else {
      const { data: iid, error: idErr } = await supabase.rpc("generate_interview_id");
      if (idErr) {
        setSaving(false);
        return toast.error(idErr.message);
      }
      payload.interview_id = iid;
      const { data: userData } = await supabase.auth.getUser();
      payload.created_by = userData.user?.id ?? null;
      ({ error } = await supabase.from("interviews").insert(payload as never));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Interview updated" : "Interview logged");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.interview_id}` : "Log Interview"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update round details and feedback." : "Interview ID is auto-generated on save."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Candidate *">
                  <Select value={form.candidate_id || undefined} onValueChange={handleCandidateChange} disabled={!!initial}>
                    <SelectTrigger><SelectValue placeholder="Select candidate…" /></SelectTrigger>
                    <SelectContent>
                      {candidateOptions.map((c) => (
                        <SelectItem key={c.candidate_id} value={c.candidate_id}>
                          {c.candidate_id} — {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Candidate Name">
                  <Input value={form.candidate_name ?? ""} onChange={(e) => set("candidate_name", e.target.value)} />
                </Field>
                <Field label="Req ID">
                  <Input value={form.req_id ?? ""} onChange={(e) => set("req_id", e.target.value)} />
                </Field>
                <Field label="Job Name">
                  <Input value={form.job_name ?? ""} onChange={(e) => set("job_name", e.target.value)} />
                </Field>
                <Field label="BU">
                  <Input value={form.bu ?? ""} onChange={(e) => set("bu", e.target.value)} />
                </Field>
                <Field label="Job Level">
                  <Input value={form.job_level ?? ""} onChange={(e) => set("job_level", e.target.value)} />
                </Field>
                <Field label="Recruiter">
                  <Input value={form.recruiter ?? ""} onChange={(e) => set("recruiter", e.target.value)} />
                </Field>
                <SelectField label="Interview Status" value={form.interview_status} onChange={(v) => set("interview_status", v)} options={INTERVIEW_STATUS_OPTIONS} />
              </div>

              {([1, 2, 3] as const).map((n) => {
                const dKey = `r${n}_date` as const;
                const pKey = `r${n}_panel` as const;
                const fKey = `r${n}_feedback` as const;
                return (
                  <div key={n} className="rounded-lg border bg-muted/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold">Round {n}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label={`R${n} Date`}>
                        <Input
                          type="date"
                          value={(form[dKey] as string | null) ?? ""}
                          onChange={(e) => set(dKey, (e.target.value || null) as never)}
                        />
                      </Field>
                      <Field label={`R${n} Panel`}>
                        <Input
                          value={(form[pKey] as string | null) ?? ""}
                          onChange={(e) => set(pKey, e.target.value as never)}
                        />
                      </Field>
                      <SelectField
                        label={`R${n} Feedback`}
                        value={(form[fKey] as string | null) ?? ""}
                        onChange={(v) => set(fKey, v as never)}
                        options={FEEDBACK_OPTIONS}
                      />
                    </div>
                  </div>
                );
              })}

              <Field label="Remarks">
                <Textarea value={form.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={3} />
              </Field>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Log Interview"}</Button>
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
