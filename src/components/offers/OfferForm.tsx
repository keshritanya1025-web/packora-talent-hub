import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_OFFER, OFFER_STATUS_OPTIONS, normalizeOfferForDb, type Offer, type OfferInput } from "@/lib/offers";

type CandidateOption = {
  candidate_id: string;
  full_name: string;
  req_id: string | null;
  job_name: string | null;
  recruiter: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Offer | null;
  candidateOptions: CandidateOption[];
  onSaved: () => void;
}

export function OfferForm({ open, onOpenChange, initial, candidateOptions, onSaved }: Props) {
  const [form, setForm] = useState<OfferInput>(EMPTY_OFFER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id: _i, offer_id: _x, created_at: _c, updated_at: _u, ...rest } = initial;
      setForm(rest as OfferInput);
    } else {
      setForm(EMPTY_OFFER);
    }
  }, [initial, open]);

  const set = <K extends keyof OfferInput>(k: K, v: OfferInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleCandidateChange = (candidateId: string) => {
    const c = candidateOptions.find((c) => c.candidate_id === candidateId);
    setForm((f) => ({
      ...f,
      candidate_id: candidateId,
      candidate_name: c?.full_name ?? f.candidate_name,
      req_id: c?.req_id ?? f.req_id,
      position_name: c?.job_name ?? f.position_name,
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
    const payload = normalizeOfferForDb(form);

    let error;
    if (initial) {
      ({ error } = await supabase.from("offers").update(payload as never).eq("id", initial.id));
    } else {
      const { data: oid, error: idErr } = await supabase.rpc("generate_offer_id");
      if (idErr) {
        setSaving(false);
        return toast.error(idErr.message);
      }
      payload.offer_id = oid;
      const { data: userData } = await supabase.auth.getUser();
      payload.created_by = userData.user?.id ?? null;
      ({ error } = await supabase.from("offers").insert(payload as never));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Offer updated" : "Offer released");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.offer_id}` : "Release Offer"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update offer details and status." : "Offer ID is auto-generated on save."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <Field label="Position Name">
                <Input value={form.position_name ?? ""} onChange={(e) => set("position_name", e.target.value)} />
              </Field>
              <Field label="Recruiter">
                <Input value={form.recruiter ?? ""} onChange={(e) => set("recruiter", e.target.value)} />
              </Field>
              <SelectField label="Offer Status" value={form.offer_status} onChange={(v) => set("offer_status", v)} options={OFFER_STATUS_OPTIONS} />
              <Field label="Offer Released Date">
                <Input
                  type="date"
                  value={form.offer_released_date ?? ""}
                  onChange={(e) => set("offer_released_date", e.target.value || null)}
                />
              </Field>
              <Field label="Offer Accepted Date">
                <Input
                  type="date"
                  value={form.offer_accepted_date ?? ""}
                  onChange={(e) => set("offer_accepted_date", e.target.value || null)}
                />
              </Field>
              <Field label="Joining Date">
                <Input
                  type="date"
                  value={form.joining_date ?? ""}
                  onChange={(e) => set("joining_date", e.target.value || null)}
                />
              </Field>
              <Field label="CTC Offered">
                <Input
                  type="number"
                  value={form.ctc_offered ?? ""}
                  onChange={(e) => set("ctc_offered", e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 1500000"
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Release Offer"}</Button>
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
