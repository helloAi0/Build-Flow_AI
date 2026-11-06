import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, MoreHorizontal, Upload, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecordDialog } from "@/components/workspace/RecordDialog";
import { upsertRecord } from "@/lib/workspace.functions";
import { deleteAppRecord, duplicateRecord, saveAppRecord } from "@/lib/runtime.functions";
import { labelOfRecord, relationSourcesFor } from "@/lib/appRelations";
import { formatMoney, type NavItem } from "@/lib/appRuntime";
import type { RuntimeRecord } from "./useApp";

type Props = {
  projectId: string;
  page: NavItem;
  records: RuntimeRecord[];
  currency: string;
  onChanged: () => void;
};

/** Plain-language message for failed saves/deletes; keeps short readable reasons. */
const friendly = (e: Error, kind: "save" | "delete" | "duplicate" = "save") => {
  const m = e.message || "";
  if (!m || /invariant|fetch|network|content-type|500|unexpected/i.test(m) || m.length > 120) {
    if (kind === "delete") return "the connection failed. Nothing was removed — please try again.";
    if (kind === "duplicate") return "the connection failed. No copy was made — please try again.";
    return "the connection failed. Your changes are kept — please try again.";
  }
  return m;
};

const MONEY_KEYS = /amount|price|total|cost|salary|fee|rate|balance|revenue|value/i;

export function RecordsPage({ projectId, page, records, currency, onChanged }: Props) {
  const def = page.def;
  const qc = useQueryClient();
  const rows = useMemo(() => records.filter((r) => r.kind === page.kind), [records, page.kind]);

  const [editing, setEditing] = useState<RuntimeRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RuntimeRecord | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const pageSize = 20;

  const up = useServerFn(upsertRecord);
  const saveWithWorkflow = useServerFn(saveAppRecord);

  // Fields that reference other modules get real values from those modules.
  const suggestions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const f of def.fields) {
      const sources = relationSourcesFor(page.kind, f.key);
      if (sources.length === 0) continue;
      const values = new Set<string>();
      for (const r of records) {
        if (!sources.includes(r.kind)) continue;
        const label = labelOfRecord(r.data);
        if (label) values.add(label);
      }
      if (values.size > 0) out[f.key] = [...values].sort().slice(0, 200);
    }
    return out;
  }, [def.fields, page.kind, records]);
  const del = useServerFn(deleteAppRecord);
  const dup = useServerFn(duplicateRecord);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["app-records", projectId] });
    onChanged();
  };

  const saveMut = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      saveWithWorkflow({
        data: { id: editing?.id, moduleId: page.moduleId, projectId, kind: page.kind, data: values },
      }),
    onSuccess: (res) => {
      toast.success("Saved");
      for (const e of res.effects) toast.info(e);
      refresh();
    },
    onError: (e: Error) => toast.error(`Could not save: ${friendly(e)}`),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (res) => { toast.success("Deleted"); for (const e of res.effects) toast.info(e); refresh(); },
    onError: (e: Error) => toast.error(`Could not delete: ${friendly(e)}`),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => dup({ data: { id } }),
    onSuccess: () => { toast.success("Duplicated"); refresh(); },
    onError: (e: Error) => toast.error(`Could not duplicate: ${friendly(e)}`),
  });

  const statusField = def.fields.find((f) => (f.key === "status" || f.key === "stage") && f.options);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      const d = r.data;
      if (filter && String(d[statusField?.key ?? ""] ?? "") !== filter) return false;
      if (!q) return true;
      return JSON.stringify(d).toLowerCase().includes(q);
    });
    if (sort) {
      const { key, dir } = sort;
      out = [...out].sort((a, b) => {
        const av = a.data[key];
        const bv = b.data[key];
        const an = typeof av === "number" ? av : String(av ?? "").toLowerCase();
        const bn = typeof bv === "number" ? bv : String(bv ?? "").toLowerCase();
        if (an < bn) return dir === "asc" ? -1 : 1;
        if (an > bn) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, query, filter, statusField, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(pageNo, pageCount);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) => {
    setPageNo(1);
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return toast.error("CSV needs a header row and at least one data row");
    const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const headers = split(lines[0]);
    const known = new Map(def.fields.map((f) => [f.key.toLowerCase(), f]));
    let ok = 0;
    for (const line of lines.slice(1)) {
      const cells = split(line);
      const rec: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        const f = known.get(h.toLowerCase()) ?? def.fields.find((x) => x.label.toLowerCase() === h.toLowerCase());
        if (!f) return;
        const raw = cells[i] ?? "";
        rec[f.key] =
          f.type === "number" ? Number(raw.replace(/[^0-9.-]/g, "")) || 0
          : f.type === "boolean" ? /^(true|yes|1)$/i.test(raw)
          : f.type === "tags" ? raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
          : raw;
      });
      if (Object.keys(rec).length === 0) continue;
      try {
        await up({ data: { moduleId: page.moduleId, projectId, kind: page.kind, data: rec } });
        ok++;
      } catch (e) {
        toast.error(`Row failed: ${(e as Error).message}`);
      }
    }
    toast.success(`Imported ${ok} record${ok === 1 ? "" : "s"}`);
    refresh();
  };

  const singular = def.label.replace(/ies$/, "y").replace(/s$/, "");
  const Icon = def.icon;

  const renderCell = (key: string, v: unknown) => {
    if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (Array.isArray(v)) {
      return <span className="flex flex-wrap gap-1">{v.map((x, i) => <Badge key={i} variant="secondary" className="text-[10px]">{String(x)}</Badge>)}</span>;
    }
    if (typeof v === "number") return MONEY_KEYS.test(key) ? formatMoney(v, currency) : v.toLocaleString();
    return String(v);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl sm:text-2xl">{page.title}</h1>
          <p className="text-sm text-muted-foreground">{def.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }}
            />
            <Button size="sm" variant="outline" asChild><span><Upload className="mr-1.5 h-4 w-4" /> Import CSV</span></Button>
          </label>
          <Button size="sm" className="bg-brand-gradient text-white" onClick={() => { setEditing(null); setAdding(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add {singular.toLowerCase()}
          </Button>
        </div>
      </div>

      {rows.length > 0 ? (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPageNo(1); }}
                placeholder={`Search ${def.label.toLowerCase()}...`}
                className="h-9 pl-8"
                aria-label={`Search ${def.label}`}
              />
            </div>
            {statusField ? (
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPageNo(1); }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                aria-label={`Filter by ${statusField.label}`}
              >
                <option value="">All {statusField.label.toLowerCase()}</option>
                {statusField.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>
          </div>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Icon className="mx-auto h-9 w-9 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg">No {def.label.toLowerCase()} yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add your first {singular.toLowerCase()} to get started.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button className="bg-brand-gradient text-white" onClick={() => { setEditing(null); setAdding(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> Add {singular.toLowerCase()}
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }}
              />
              <Button variant="outline" asChild><span><Upload className="mr-1.5 h-4 w-4" /> Import {def.label.toLowerCase()}</span></Button>
            </label>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No matches for your search or filter.
          <div className="mt-3"><Button size="sm" variant="outline" onClick={() => { setQuery(""); setFilter(""); }}>Clear filters</Button></div>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {def.listColumns.map((c) => {
                  const label = def.fields.find((f) => f.key === c)?.label ?? c;
                  const arrow = sort?.key === c ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
                  return (
                    <TableHead key={c} className="cursor-pointer select-none" onClick={() => toggleSort(c)}>
                      {label}{arrow}
                    </TableHead>
                  );
                })}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => { setEditing(r); setAdding(false); }}>
                  {def.listColumns.map((c) => (
                    <TableCell key={c} className="max-w-[220px] truncate">{renderCell(c, r.data[c])}</TableCell>
                  ))}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Record actions"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(r); setAdding(false); }}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dupMut.mutate(r.id)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={(e) => { e.preventDefault(); setPendingDelete(r); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>


                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pageCount > 1 ? (
            <div className="flex items-center justify-end gap-2 border-t border-border p-3 text-sm text-muted-foreground">
              <Button size="sm" variant="outline" disabled={current <= 1} onClick={() => setPageNo(current - 1)}>Prev</Button>
              <span>Page {current} of {pageCount}</span>
              <Button size="sm" variant="outline" disabled={current >= pageCount} onClick={() => setPageNo(current + 1)}>Next</Button>
            </div>
          ) : null}
        </Card>
      )}

      <RecordDialog
        key={editing?.id ?? (adding ? "new" : "idle")}
        open={adding || !!editing}

        onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}
        kind={page.kind}
        config={page.config}
        initial={editing ? editing.data : null}
        suggestions={suggestions}
        onSubmit={async (values) => { await saveMut.mutateAsync(values); }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the record from your application.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) delMut.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
