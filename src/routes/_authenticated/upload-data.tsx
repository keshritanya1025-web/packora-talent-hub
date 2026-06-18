import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, History } from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_SHEETS,
  isAllowedSheet,
  SHEET_TO_ENTITY,
  normalizeColumnName,
  cleanRow,
} from "@/lib/dataCleaning";
import { ENTITY_COLUMNS, REQUIRED_FIELDS, importRows, type EntityKind } from "@/lib/importer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/upload-data")({
  head: () => ({ meta: [{ title: "Upload Data — Packfora" }] }),
  component: UploadDataPage,
});

const MAX_BYTES = 200 * 1024 * 1024;

type SheetData = {
  name: string;
  entity: EntityKind;
  rawColumns: string[];
  mappedColumns: string[];
  rows: Record<string, unknown>[];
  cleanedPreview: Record<string, unknown>[];
};

interface HistoryRow {
  id: string;
  file_name: string;
  sheet_name: string;
  entity: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  status: string;
  created_at: string;
}

function UploadDataPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [ignoredSheets, setIgnoredSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Record<string, Awaited<ReturnType<typeof importRows>>>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("import_history")
      .select("id,file_name,sheet_name,entity,total_rows,imported_rows,failed_rows,status,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setHistory((data as HistoryRow[]) ?? []);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(`File exceeds 200 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }
    setFileName(file.name);
    setFileSize(file.size);
    setResults({});
    setProgress(0);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });

    const accepted: SheetData[] = [];
    const ignored: string[] = [];
    for (const name of wb.SheetNames) {
      if (!isAllowedSheet(name)) {
        ignored.push(name);
        continue;
      }
      const entity = SHEET_TO_ENTITY[name];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], {
        defval: null,
        raw: false,
      });
      const rawColumns = rows.length ? Object.keys(rows[0]) : [];
      const mappedColumns = rawColumns.map(normalizeColumnName);
      const cleanedPreview = rows.slice(0, 5).map((r) => cleanRow(entity, r));
      accepted.push({ name, entity, rawColumns, mappedColumns, rows, cleanedPreview });
    }

    setSheets(accepted);
    setIgnoredSheets(ignored);
    setActiveSheet(accepted[0]?.name ?? "");

    if (!accepted.length) {
      toast.error("No recognised sheets found. Expected: " + ALLOWED_SHEETS.join(", "));
    } else {
      toast.success(`Loaded ${accepted.length} sheet(s). ${ignored.length} ignored.`);
    }
  };

  const runImport = async () => {
    if (!sheets.length || !user) return;
    setImporting(true);
    setProgress(0);
    const newResults: typeof results = {};
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      try {
        const res = await importRows(s.entity, s.rows);
        newResults[s.name] = res;
        await supabase.from("import_history").insert({
          user_id: user.id,
          file_name: fileName,
          file_size: fileSize,
          sheet_name: s.name,
          entity: s.entity,
          total_rows: res.total,
          imported_rows: res.imported,
          failed_rows: res.failed,
          status: res.failed === 0 ? "success" : res.imported === 0 ? "failed" : "partial",
          error_summary: JSON.parse(JSON.stringify(res.errors.slice(0, 50))),
        });
      } catch (e) {
        toast.error(`${s.name}: ${(e as Error).message}`);
      }
      setProgress(Math.round(((i + 1) / sheets.length) * 100));
    }
    setResults(newResults);
    setImporting(false);
    loadHistory();
    const totalImp = Object.values(newResults).reduce((a, r) => a + r.imported, 0);
    const totalFail = Object.values(newResults).reduce((a, r) => a + r.failed, 0);
    const totalSkip = Object.values(newResults).reduce((a, r) => a + (r.skipped ?? 0), 0);
    toast.success(`Imported ${totalImp} rows. ${totalSkip} duplicates skipped. ${totalFail} failed.`);
  };

  const active = sheets.find((s) => s.name === activeSheet);

  const totals = useMemo(() => {
    const list = Object.values(results);
    return {
      imported: list.reduce((a, r) => a + r.imported, 0),
      failed: list.reduce((a, r) => a + r.failed, 0),
      skipped: list.reduce((a, r) => a + (r.skipped ?? 0), 0),
      total: list.reduce((a, r) => a + r.total, 0),
    };
  }, [results]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Data"
        description="Upload Excel (.xlsx) or CSV files up to 200 MB. Only the recognised recruitment sheets will be processed."
        actions={
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={importing}>
              <Upload className="mr-2 h-4 w-4" />
              {fileName ? "Replace file" : "Upload file"}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recognised sheets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ALLOWED_SHEETS.map((s) => (
            <Badge key={s} variant="outline" className="font-mono text-xs">
              {s} → {SHEET_TO_ENTITY[s]}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {!sheets.length && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No file uploaded yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Drop in an XLSX or CSV. We'll filter to the four supported sheets, clean the data, validate it, and import
              cleaned records into the database.
            </p>
          </CardContent>
        </Card>
      )}

      {sheets.length > 0 && active && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}{" "}
                <span className="text-xs text-muted-foreground">
                  ({(fileSize / 1024 / 1024).toFixed(2)} MB)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Sheets processed" value={sheets.length} />
                <Stat label="Sheets ignored" value={ignoredSheets.length} />
                <Stat label="Total rows" value={sheets.reduce((a, s) => a + s.rows.length, 0)} />
                <Stat label="Active sheet rows" value={active.rows.length} />
              </div>

              {ignoredSheets.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Ignored sheets</AlertTitle>
                  <AlertDescription className="text-xs">
                    {ignoredSheets.join(", ")} — not in the allowed list.
                  </AlertDescription>
                </Alert>
              )}

              <Tabs value={activeSheet} onValueChange={setActiveSheet}>
                <TabsList className="flex-wrap">
                  {sheets.map((s) => (
                    <TabsTrigger key={s.name} value={s.name}>
                      {s.name} <Badge variant="secondary" className="ml-2">{s.entity}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Column mapping preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Column mapping ({active.name})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[280px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original column</TableHead>
                      <TableHead>Cleaned column</TableHead>
                      <TableHead>Known field?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.rawColumns.map((raw, i) => {
                      const norm = active.mappedColumns[i];
                      const known = ENTITY_COLUMNS[active.entity].includes(norm);
                      return (
                        <TableRow key={raw + i}>
                          <TableCell className="font-mono text-xs">{raw}</TableCell>
                          <TableCell className="font-mono text-xs">{norm}</TableCell>
                          <TableCell>
                            {known ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Mapped</Badge>
                            ) : (
                              <Badge variant="secondary">Ignored</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="mt-3 text-xs text-muted-foreground">
                Required fields for {active.entity}: {REQUIRED_FIELDS[active.entity].join(", ")}
              </p>
            </CardContent>
          </Card>

          {/* Cleaned preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cleaned preview (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {ENTITY_COLUMNS[active.entity].slice(0, 8).map((c) => (
                        <TableHead key={c} className="font-mono text-xs">{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.cleanedPreview.map((r, i) => (
                      <TableRow key={i}>
                        {ENTITY_COLUMNS[active.entity].slice(0, 8).map((c) => (
                          <TableCell key={c} className="max-w-[180px] truncate text-xs">
                            {r[c] == null ? <span className="text-muted-foreground">—</span> : String(r[c])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Import action */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">
              Ready to import {sheets.reduce((a, s) => a + s.rows.length, 0)} row(s) across {sheets.length} sheet(s).
            </div>
            <Button onClick={runImport} disabled={importing}>
              {importing ? "Importing…" : "Import to database"}
            </Button>
          </div>

          {importing && <Progress value={progress} />}

          {/* Results */}
          {Object.keys(results).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {totals.failed === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  Import results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Stat label="Total" value={totals.total} />
                  <Stat label="Imported" value={totals.imported} />
                  <Stat label="Duplicates skipped" value={totals.skipped} />
                  <Stat label="Failed" value={totals.failed} />
                </div>
                {Object.entries(results).map(([sheetName, r]) => (
                  <div key={sheetName} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{sheetName}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.imported} / {r.total} imported · {r.skipped ?? 0} duplicates · {r.failed} failed
                      </span>
                    </div>
                    {r.errors.length > 0 && (
                      <ScrollArea className="mt-2 max-h-40">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Row</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.errors.slice(0, 100).map((e, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono">{e.row}</TableCell>
                                <TableCell className="text-destructive">{e.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Import history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Import history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Sheet</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">{h.file_name}</TableCell>
                    <TableCell className="text-xs">{h.sheet_name}</TableCell>
                    <TableCell className="text-xs">{h.entity}</TableCell>
                    <TableCell className="text-right">{h.imported_rows}</TableCell>
                    <TableCell className="text-right">{h.failed_rows}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          h.status === "success"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                            : h.status === "partial"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : "bg-red-100 text-red-800 hover:bg-red-100"
                        }
                      >
                        {h.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
