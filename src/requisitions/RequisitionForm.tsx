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
  EMPTY_REQUISITION,
  NICHE_BAU_OPTIONS,
  NEW_OR_REPLACEMENT_OPTIONS,
  POSITION_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  normalizeForDb,
  type Requisition,
  type RequisitionInput,
} from "@/lib/requisitions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Requisition | null;
  onSaved: () => void;
}

export function RequisitionForm({ open, onOpenChange, initial, onSaved }: Props) {
  const [form, setForm] = useState<RequisitionInput>(EMPTY_REQUISITION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id: _id, req_id: _r, created_at: _c, updated_at: _u, ...rest } = initial;
      setForm(rest as RequisitionInput);
    } else {
      setForm(EMPTY_REQUISITION);
    }
  }, [initial, open]);

  const set = <K extends keyof RequisitionInput>(k: K, v: RequisitionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string): number | null => (v === "" ? null : Number(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.position_name?.trim()) {
      toast.error("Position Name is required");
      return;
    }
    setSaving(true);
    const payload = normalizeForDb(form) as Record<string, unknown>;

    let error;
    if (initial) {
      ({ error } = await supabase.from("requisitions").update(payload as never).eq("id", initial.id));
    } else {
      const { data: userData } = await supabase.auth.getUser();
      payload.created_by = userData.user?.id ?? null;
      ({ error } = await supabase.from("requisitions").insert(payload as never));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Requisition updated" : "Requisition created");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.req_id}` : "New Requisition"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update requisition details." : "Req ID is auto-generated on save."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Position Name *">
                <Input value={form.position_name} onChange={(e) => set("position_name", e.target.value)} required />
              </Field>
              <Field label="FY">
                <Input value={form.fy ?? ""} onChange={(e) => set("fy", e.target.value)} placeholder="FY25-26" />
              </Field>
              <Field label="BU">
                <Input value={form.bu ?? ""} onChange={(e) => set("bu", e.target.value)} />
              </Field>
              <Field label="Country">
                <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
              </Field>
              <Field label="Location">
                <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Position Level">
                <Input value={form.position_level ?? ""} onChange={(e) => set("position_level", e.target.value)} />
              </Field>
              <Field label="Client Name">
                <Input value={form.client_name ?? ""} onChange={(e) => set("client_name", e.target.value)} />
              </Field>
              <SelectField label="Priority" value={form.priority ?? ""} onChange={(v) => set("priority", v)} options={PRIORITY_OPTIONS} />
              <Field label="Client Manager">
                <Input value={form.client_manager ?? ""} onChange={(e) => set("client_manager", e.target.value)} />
              </Field>
              <Field label="Hiring Manager">
                <Input value={form.hiring_manager ?? ""} onChange={(e) => set("hiring_manager", e.target.value)} />
              </Field>
              <Field label="BU Lead">
                <Input value={form.bu_lead ?? ""} onChange={(e) => set("bu_lead", e.target.value)} />
              </Field>
              <Field label="Probable Candidate">
                <Input value={form.probable_candidate ?? ""} onChange={(e) => set("probable_candidate", e.target.value)} />
              </Field>
              <Field label="Date of Request">
                <Input type="date" value={form.date_of_request ?? ""} onChange={(e) => set("date_of_request", e.target.value || null)} />
              </Field>
              <SelectField label="Current Status" value={form.current_status} onChange={(v) => set("current_status", v)} options={STATUS_OPTIONS} />
              <Field label="Days Since Open">
                <Input type="number" value={form.days_since_open ?? ""} onChange={(e) => set("days_since_open", num(e.target.value))} />
              </Field>
              <Field label="Dead Days">
                <Input type="number" value={form.dead_days ?? ""} onChange={(e) => set("dead_days", num(e.target.value))} />
              </Field>
              <Field label="Effective Days Since Open">
                <Input type="number" value={form.effective_days_since_open ?? ""} onChange={(e) => set("effective_days_since_open", num(e.target.value))} />
              </Field>
              <SelectField label="Position Type" value={form.position_type ?? ""} onChange={(v) => set("position_type", v)} options={POSITION_TYPE_OPTIONS} />
              <Field label="Recruiter">
                <Input value={form.recruiter ?? ""} onChange={(e) => set("recruiter", e.target.value)} />
              </Field>
              <SelectField label="New or Replacement" value={form.new_or_replacement ?? ""} onChange={(v) => set("new_or_replacement", v)} options={NEW_OR_REPLACEMENT_OPTIONS} />
              <Field label="Replacement Name">
                <Input value={form.replacement_name ?? ""} onChange={(e) => set("replacement_name", e.target.value)} />
              </Field>
              <Field label="Budget Max">
                <Input type="number" step="0.01" value={form.budget_max ?? ""} onChange={(e) => set("budget_max", num(e.target.value))} />
              </Field>
              <Field label="Final Candidate">
                <Input value={form.final_candidate ?? ""} onChange={(e) => set("final_candidate", e.target.value)} />
              </Field>
              <Field label="Offer Released Date">
                <Input type="date" value={form.offer_released_date ?? ""} onChange={(e) => set("offer_released_date", e.target.value || null)} />
              </Field>
              <Field label="Offer Accepted Date">
                <Input type="date" value={form.offer_accepted_date ?? ""} onChange={(e) => set("offer_accepted_date", e.target.value || null)} />
              </Field>
              <Field label="Joining Date">
                <Input type="date" value={form.joining_date ?? ""} onChange={(e) => set("joining_date", e.target.value || null)} />
              </Field>
              <Field label="Month of Joining">
                <Input value={form.month_of_joining ?? ""} onChange={(e) => set("month_of_joining", e.target.value)} placeholder="e.g. Apr 2026" />
              </Field>
              <Field label="Source">
                <Input value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} />
              </Field>
              <Field label="Cost of Hire">
                <Input type="number" step="0.01" value={form.cost_of_hire ?? ""} onChange={(e) => set("cost_of_hire", num(e.target.value))} />
              </Field>
              <Field label="CTC Offered">
                <Input type="number" step="0.01" value={form.ctc_offered ?? ""} onChange={(e) => set("ctc_offered", num(e.target.value))} />
              </Field>
              <Field label="Passout Year">
                <Input type="number" value={form.passout_year ?? ""} onChange={(e) => set("passout_year", num(e.target.value))} />
              </Field>
              <Field label="Root Cause Category">
                <Input value={form.root_cause_category ?? ""} onChange={(e) => set("root_cause_category", e.target.value)} />
              </Field>
              <SelectField label="Niche or BAU" value={form.niche_or_bau ?? ""} onChange={(v) => set("niche_or_bau", v)} options={NICHE_BAU_OPTIONS} />
              <Field label="Reason" className="md:col-span-2 lg:col-span-3">
                <Textarea value={form.reason ?? ""} onChange={(e) => set("reason", e.target.value)} rows={2} />
              </Field>
              <Field label="Remarks" className="md:col-span-2 lg:col-span-3">
                <Textarea value={form.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={2} />
              </Field>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Create Requisition"}</Button>
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
