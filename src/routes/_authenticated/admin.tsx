import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, PlaceholderCard } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Search, KeyRound, Ban, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { writeAudit } from "@/lib/auditLog";
import {
  listUsers, createUser, assignRole, setUserDisabled, resetUserPassword,
  deleteUser, clearAuditLogs, deleteAuditLog, checkAdminAccess, clearAllData,
} from "@/lib/admin.functions";
import { redirect, isRedirect } from "@tanstack/react-router";

const SUPER_ADMIN_EMAIL = "admin@admin.local";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Control Center — Packfora" }] }),
  beforeLoad: async () => {
    try {
      const res = await checkAdminAccess();
      if (!res?.isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e: any) {
      if (isRedirect(e)) throw e;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPanel,
});

type Field = { key: string; label: string; required?: boolean };
type MasterDef = {
  table: "locations" | "recruiters" | "business_units" | "departments" | "expertise" | "levels" | "sources";
  label: string;
  fields: Field[];
  searchKeys: string[];
};

const MASTERS: MasterDef[] = [
  { table: "locations", label: "Locations", searchKeys: ["city", "country", "region"],
    fields: [
      { key: "city", label: "City", required: true },
      { key: "country", label: "Country", required: true },
      { key: "region", label: "Region" },
    ] },
  { table: "recruiters", label: "Recruiters", searchKeys: ["name", "email"],
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "email", label: "Email" },
    ] },
  { table: "business_units", label: "Business Units", searchKeys: ["name"],
    fields: [{ key: "name", label: "Name", required: true }] },
  { table: "departments", label: "Departments", searchKeys: ["department_name"],
    fields: [{ key: "department_name", label: "Department name", required: true }] },
  { table: "expertise", label: "Expertise", searchKeys: ["name"],
    fields: [{ key: "name", label: "Expertise", required: true }] },
  { table: "levels", label: "Levels", searchKeys: ["level_name"],
    fields: [{ key: "level_name", label: "Level name", required: true }] },
  { table: "sources", label: "Sources", searchKeys: ["source_name"],
    fields: [{ key: "source_name", label: "Source name", required: true }] },
];

const PAGE_SIZE = 10;

function AdminPanel() {
  const { isAdmin, loading } = useUserRoles();

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Control Center" />
        <PlaceholderCard title="Access restricted" body="You need the System Admin role to access this section." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Control Center"
        description="Manage master data, users, roles, and view the audit trail."
        actions={<Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><ShieldCheck className="mr-1 h-3 w-3" />System Admin</Badge>}
      />
      <Tabs defaultValue="locations">
        <TabsList className="flex-wrap">
          {MASTERS.map((m) => <TabsTrigger key={m.table} value={m.table}>{m.label}</TabsTrigger>)}
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="danger" className="text-red-700 data-[state=active]:text-red-700">Danger Zone</TabsTrigger>
        </TabsList>
        {MASTERS.map((m) => (
          <TabsContent key={m.table} value={m.table} className="mt-4">
            <MasterTable def={m} />
          </TabsContent>
        ))}
        <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditPanel /></TabsContent>
        <TabsContent value="danger" className="mt-4"><DangerZonePanel /></TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------- Master data CRUD -----------------

function MasterTable({ def }: { def: MasterDef }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", def.table],
    queryFn: async () => {
      const { data, error } = await (supabase.from(def.table) as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r: any) => def.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  }, [rows, search, def.searchKeys]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing({}); setDialogOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setDialogOpen(true); };

  const save = async (values: Record<string, any>) => {
    const isUpdate = !!editing?.id;
    const payload: Record<string, any> = {};
    def.fields.forEach((f) => { payload[f.key] = values[f.key] || null; });
    const missing = def.fields.filter((f) => f.required && !payload[f.key]);
    if (missing.length) { toast.error(`Required: ${missing.map((f) => f.label).join(", ")}`); return; }
    let result: any;
    if (isUpdate) {
      result = await (supabase.from(def.table) as any).update(payload).eq("id", editing!.id).select().single();
    } else {
      result = await (supabase.from(def.table) as any).insert(payload).select().single();
    }
    if (result.error) { toast.error(result.error.message); return; }
    await writeAudit(isUpdate ? "update" : "create", def.table, result.data?.id ?? null, payload);
    toast.success(`${def.label.replace(/s$/, "")} ${isUpdate ? "updated" : "created"}`);
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["admin", def.table] });
  };

  const del = async (row: any) => {
    const { error } = await (supabase.from(def.table) as any).delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await writeAudit("delete", def.table, row.id, row);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", def.table] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{def.label}</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search…" className="h-9 pl-8 w-[220px]" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" />Add</Button>
            </DialogTrigger>
            <MasterFormDialog def={def} editing={editing} onSave={save} />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {def.fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={def.fields.length + 1} className="text-center text-sm text-muted-foreground">No records</TableCell></TableRow>
                )}
                {pageRows.map((r: any) => (
                  <TableRow key={r.id}>
                    {def.fields.map((f) => <TableCell key={f.key}>{r[f.key] ?? "—"}</TableCell>)}
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <DeleteButton onConfirm={() => del(r)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>{filtered.length} record(s)</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <span>Page {page} / {pageCount}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MasterFormDialog({
  def, editing, onSave,
}: { def: MasterDef; editing: Record<string, any> | null; onSave: (v: Record<string, any>) => void }) {
  const [values, setValues] = useState<Record<string, any>>({});
  useEffect(() => { setValues(editing ?? {}); }, [editing]);
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing?.id ? "Edit" : "Add"} {def.label.replace(/s$/, "")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        {def.fields.map((f) => (
          <div key={f.key}>
            <Label>{f.label}{f.required && " *"}</Label>
            <Input value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(values)}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete record?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ----------------- Users -----------------

function UsersPanel() {
  const qc = useQueryClient();
  const fnList = useServerFn(listUsers);
  const fnCreate = useServerFn(createUser);
  const fnRole = useServerFn(assignRole);
  const fnDisable = useServerFn(setUserDisabled);
  const fnReset = useServerFn(resetUserPassword);
  const fnDelete = useServerFn(deleteUser);
  const { user: currentUser } = useAuth();
  const isSuperAdmin = (currentUser?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fnList(),
  });

  const filtered = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter((u: any) => (u.email ?? "").toLowerCase().includes(s) || (u.name ?? "").toLowerCase().includes(s));
  }, [users, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = async (values: { email: string; password: string; name: string; role: string }) => {
    try {
      await fnCreate({ data: values });
      await writeAudit("create_user", "users", null, { email: values.email, role: values.role });
      toast.success("User created");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleRole = async (userId: string, role: string) => {
    try {
      await fnRole({ data: { userId, role: role as any } });
      await writeAudit("assign_role", "users", userId, { role });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleDisable = async (userId: string, disabled: boolean) => {
    try {
      await fnDisable({ data: { userId, disabled } });
      await writeAudit(disabled ? "disable_user" : "enable_user", "users", userId);
      toast.success(disabled ? "User disabled" : "User enabled");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleReset = async (password: string) => {
    if (!resetTarget) return;
    try {
      await fnReset({ data: { userId: resetTarget.id, password } });
      await writeAudit("reset_password", "users", resetTarget.id);
      toast.success(`Password reset for ${resetTarget.email}`);
      setResetTarget(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleDelete = async (u: { id: string; email: string }) => {
    try {
      await fnDelete({ data: { userId: u.id } });
      await writeAudit("delete_user", "users", u.id, { email: u.email });
      toast.success(`Deleted ${u.email}`);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Users</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search email or name…" className="h-9 pl-8 w-[260px]" />
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Create user</Button></DialogTrigger>
            <CreateUserDialog onSubmit={handleCreate} />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading users…</p> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((u: any) => {
                  const disabled = !!u.banned_until && u.banned_until !== "none";
                  return (
                    <TableRow key={u.id}>
                      <TableCell>{u.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.roles[0] ?? "recruiter"} onValueChange={(v) => handleRole(u.id, v)}>
                          <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system_admin">System Admin</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="business_lead">Business Lead</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {disabled
                          ? <Badge variant="destructive">Disabled</Badge>
                          : <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" title="Reset password" onClick={() => setResetTarget({ id: u.id, email: u.email })}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={disabled ? "Enable" : "Disable"} onClick={() => handleDisable(u.id, !disabled)}>
                          {disabled ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-destructive" />}
                        </Button>
                        {isSuperAdmin && u.email !== SUPER_ADMIN_EMAIL && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" title="Delete user" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete user {u.email}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes the user account, profile, and role assignments. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete({ id: u.id, email: u.email })}>Delete user</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>{filtered.length} user(s)</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <span>Page {page} / {pageCount}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</Button>
              </div>
            </div>
          </>
        )}
        <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} onSubmit={handleReset} />
      </CardContent>
    </Card>
  );
}

function CreateUserDialog({ onSubmit }: { onSubmit: (v: { email: string; password: string; name: string; role: string }) => void }) {
  const [v, setV] = useState({ email: "", password: "", name: "", role: "recruiter" });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div><Label>Email *</Label><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
        <div><Label>Password * (min 8)</Label><Input type="password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></div>
        <div>
          <Label>Role</Label>
          <Select value={v.role} onValueChange={(r) => setV({ ...v, role: r })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system_admin">System Admin</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="business_lead">Business Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(v)} disabled={!v.email || v.password.length < 8}>Create</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ResetPasswordDialog({
  target, onClose, onSubmit,
}: { target: { id: string; email: string } | null; onClose: () => void; onSubmit: (pwd: string) => void }) {
  const [pwd, setPwd] = useState("");
  useEffect(() => { setPwd(""); }, [target]);
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset password for {target?.email}</DialogTitle></DialogHeader>
        <div>
          <Label>New password (min 8)</Label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(pwd)} disabled={pwd.length < 8}>Set password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------- Audit Log -----------------

function AuditPanel() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = (currentUser?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const fnClear = useServerFn(clearAuditLogs);
  const fnDeleteOne = useServerFn(deleteAuditLog);
  const [search, setSearch] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r: any) =>
      [r.action, r.entity, r.entity_id, r.user_email].some((x) => String(x ?? "").toLowerCase().includes(s)),
    );
  }, [rows, search]);

  const handleClear = async () => {
    try {
      await fnClear({});
      toast.success("Audit log cleared");
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await fnDeleteOne({ data: { id } });
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Audit Log</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…" className="h-9 pl-8 w-[260px]" />
          </div>
          {isSuperAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive"><Trash2 className="mr-1 h-4 w-4" />Clear all</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all audit log entries?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every audit log row. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>Delete all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Details</TableHead>
                  {isSuperAdmin && <TableHead className="w-[60px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-sm text-muted-foreground">No entries</TableCell></TableRow>
                )}
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.user_email ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                    <TableCell className="text-xs">{r.entity}</TableCell>
                    <TableCell className="font-mono text-xs">{r.entity_id ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate font-mono text-xs text-muted-foreground">
                      {r.details ? JSON.stringify(r.details) : "—"}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteOne(r.id)} title="Delete entry">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------- Danger Zone -----------------

function DangerZonePanel() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = (currentUser?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const fnClearLogs = useServerFn(clearAuditLogs);
  const fnClearData = useServerFn(clearAllData);
  const [dataConfirm, setDataConfirm] = useState("");
  const [busy, setBusy] = useState<"logs" | "data" | null>(null);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only the super admin ({SUPER_ADMIN_EMAIL}) can clear data or logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleClearLogs = async () => {
    setBusy("logs");
    try {
      await fnClearLogs({});
      toast.success("All audit logs cleared");
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const handleClearData = async () => {
    setBusy("data");
    try {
      const res = await fnClearData({ data: { confirm: dataConfirm } });
      const c = (res as any).counts ?? {};
      const total = Object.values(c).reduce((a: number, b: any) => a + (b as number), 0);
      toast.success(`Cleared ${total} records`);
      setDataConfirm("");
      qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-700">Clear all operational data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently deletes <b>all candidates, requisitions, interviews, offers, and import history</b>.
            Master data (locations, recruiters, BUs, etc.), users, roles, and audit log are preserved.
            This cannot be undone.
          </p>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="confirm-data">
              Type <code className="rounded bg-muted px-1">DELETE ALL DATA</code> to enable
            </Label>
            <Input
              id="confirm-data"
              value={dataConfirm}
              onChange={(e) => setDataConfirm(e.target.value)}
              placeholder="DELETE ALL DATA"
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={dataConfirm !== "DELETE ALL DATA" || busy !== null}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {busy === "data" ? "Clearing…" : "Clear all data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all operational data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove every candidate, requisition, interview, offer, and import record.
                  There is no undo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData}>Yes, delete everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-base text-amber-700">Clear audit logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently deletes every audit log entry. Operational data (candidates, requisitions, etc.)
            is not affected.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy !== null}>
                <Trash2 className="mr-1 h-4 w-4" />
                {busy === "logs" ? "Clearing…" : "Clear all logs"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all audit log entries?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes every audit log row. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearLogs}>Delete all logs</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
