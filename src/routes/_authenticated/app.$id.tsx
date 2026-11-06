import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Sparkles, Download, Trash2, MoreHorizontal, Pencil,
  Layers, ChevronRight, FolderKanban, FileJson, FileText, Rocket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  listWorkspace, addModule, removeModule, renameModule,
  listRecords, upsertRecord, deleteRecord, exportProject,
} from "@/lib/workspace.functions";
import { getModule, MODULE_CATALOG, amountKey, type ModuleKind } from "@/lib/modules";
import { resolveModuleDef } from "@/lib/appRuntime";
import { RecordDialog } from "@/components/workspace/RecordDialog";
import { AssistantSheet } from "@/components/workspace/AssistantSheet";
import { AddModuleDialog } from "@/components/workspace/AddModuleDialog";
import { downloadJSON, downloadMarkdown, downloadStandaloneApp } from "@/lib/export";
import { downloadSourceProject } from "@/lib/exportProject";
import type { Tables } from "@/integrations/supabase/types";

const search = z.object({ m: z.string().optional() });

export const Route = createFileRoute("/_authenticated/app/$id")({
  head: () => ({ meta: [{ title: "Workspace — BuildFlow AI" }] }),
  validateSearch: search,
  component: Workspace,
});

type Module = Tables<"project_modules">;
type Record_ = Tables<"module_records">;

function Workspace() {
  const { id } = Route.useParams();
  const { m: activeModuleId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const list = useServerFn(listWorkspace);
  const { data, isLoading } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => list({ data: { projectId: id } }),
  });

  const project = data?.project ?? null;
  const modules = (data?.modules ?? []) as Module[];

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const add = useServerFn(addModule);
  const addMut = useMutation({
    mutationFn: (kind: ModuleKind) => add({ data: { projectId: id, kind } }),
    onSuccess: () => { toast.success("Module added"); qc.invalidateQueries({ queryKey: ["workspace", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rm = useServerFn(removeModule);
  const rmMut = useMutation({
    mutationFn: (moduleId: string) => rm({ data: { moduleId } }),
    onSuccess: () => {
      toast.success("Module removed");
      qc.invalidateQueries({ queryKey: ["workspace", id] });
      if (activeModuleId && !modules.find((x) => x.id !== activeModuleId)) {
        navigate({ to: "/app/$id", params: { id }, search: {} });
      }
    },
  });

  const ren = useServerFn(renameModule);
  const renMut = useMutation({
    mutationFn: () => ren({ data: { moduleId: renameId!, title: renameVal } }),
    onSuccess: () => { setRenameId(null); qc.invalidateQueries({ queryKey: ["workspace", id] }); },
  });

  const exp = useServerFn(exportProject);
  const doExport = async (format: "json" | "md" | "app" | "src") => {
    const res = await exp({ data: { projectId: id } });
    if (format === "json") downloadJSON(res.project, res.modules as Module[], res.records as Record_[]);
    else if (format === "md") downloadMarkdown(res.project, res.modules as Module[], res.records as Record_[]);
    else if (format === "src") await downloadSourceProject(res.project, res.modules as Module[], res.records as Record_[]);
    else downloadStandaloneApp(res.project, res.modules as Module[], res.records as Record_[]);
    toast.success("Downloaded");
  };

  const deleteProject = async () => {
    if (!confirm("Delete this project and all its modules?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["projects"] });
    navigate({ to: "/projects" });
  };

  const active = useMemo(() => modules.find((x) => x.id === activeModuleId) ?? null, [modules, activeModuleId]);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }
  if (!project) {
    return (
      <Card className="p-12 text-center">
        <h2 className="font-display text-xl">Project not found</h2>
        <Link to="/projects" className="mt-4 inline-block"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to projects</Button></Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Projects
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl sm:text-3xl">{project.name}</h1>
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" onClick={() => setAssistantOpen(true)} className="bg-brand-gradient text-white">
            <Sparkles className="mr-1.5 h-4 w-4" /> Assistant
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/export/$id" params={{ id }}><Rocket className="mr-2 h-4 w-4" /> Export &amp; deploy centre</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("src")}><Download className="mr-2 h-4 w-4" /> Full source code (Next.js ZIP)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("app")}><Download className="mr-2 h-4 w-4" /> Standalone app (HTML)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("json")}><FileJson className="mr-2 h-4 w-4" /> Export as JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("md")}><FileText className="mr-2 h-4 w-4" /> Export as Markdown</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deleteProject} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete project</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <Card className="h-fit p-2">
          <button
            onClick={() => navigate({ to: "/app/$id", params: { id }, search: {} })}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${!active ? "bg-accent font-medium" : "hover:bg-accent"}`}
          >
            <FolderKanban className="h-4 w-4" /> Overview
          </button>
          <div className="mt-2 px-3 pt-2 text-xs uppercase tracking-wide text-muted-foreground">Modules</div>
          <div className="mt-1 space-y-1">
            {modules.map((m) => {
              const def = getModule(m.kind);
              const Icon = def?.icon ?? Layers;
              const isActive = m.id === activeModuleId;
              return (
                <div key={m.id} className={`group flex items-center gap-1 rounded-md ${isActive ? "bg-accent" : "hover:bg-accent"}`}>
                  <button
                    onClick={() => navigate({ to: "/app/$id", params: { id }, search: { m: m.id } })}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{m.title}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="mr-1 rounded p-1 opacity-0 hover:bg-muted group-hover:opacity-100" aria-label="Module actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setRenameId(m.id); setRenameVal(m.title); }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => rmMut.mutate(m.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)} className="mt-2 w-full justify-start">
            <Plus className="mr-2 h-4 w-4" /> Add module
          </Button>
        </Card>

        {/* Main panel */}
        <div className="min-w-0">
          {active ? (
            <ModulePanel projectId={id} module={active} />
          ) : (
            <OverviewPanel projectId={id} modules={modules} onOpen={(mid) => navigate({ to: "/app/$id", params: { id }, search: { m: mid } })} onAdd={() => setAddOpen(true)} />
          )}
        </div>
      </div>

      <AssistantSheet open={assistantOpen} onOpenChange={setAssistantOpen} projectId={id} />
      <AddModuleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existing={modules.map((m) => m.kind)}
        onPick={(k) => addMut.mutate(k)}
      />

      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename module</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button onClick={() => renMut.mutate()} className="bg-brand-gradient text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewPanel({ projectId, modules, onOpen, onAdd }: { projectId: string; modules: Module[]; onOpen: (id: string) => void; onAdd: () => void }) {
  const { data: all = [] } = useQuery({
    queryKey: ["overview-records", projectId],
    queryFn: async () => (await supabase.from("module_records").select("kind, data, created_at").eq("project_id", projectId)).data ?? [],
  });

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    let revenue = 0, expenses = 0, invoicesPending = 0, invoicesPaid = 0;
    for (const r of all) {
      counts[r.kind] = (counts[r.kind] ?? 0) + 1;
      const d = (r.data ?? {}) as Record<string, unknown>;
      const key = amountKey(r.kind);
      const val = key ? Number(d[key] ?? 0) : 0;
      if (r.kind === "invoices") {
        if (d.status === "paid") { revenue += val; invoicesPaid++; }
        else if (d.status !== "void" && d.status !== "draft") invoicesPending += val;
      } else if (r.kind === "payments" || r.kind === "sales" || r.kind === "orders") {
        revenue += val;
      } else if (r.kind === "expenses" || r.kind === "purchases") {
        expenses += val;
      }
    }
    return { counts, revenue, expenses, invoicesPending, invoicesPaid, totalRecords: all.length };
  }, [all]);

  const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-brand-gradient p-6 text-white shadow-glow">
        <p className="text-xs uppercase tracking-wide text-white/80">Live workspace</p>
        <p className="mt-1 font-display text-xl">{modules.length} modules · {kpis.totalRecords} records</p>
        <p className="mt-2 text-sm text-white/85">Everything below is real data stored in your database. Click a module to manage it, or open the AI Assistant to add features.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue" value={money(kpis.revenue)} />
        <Kpi label="Expenses" value={money(kpis.expenses)} />
        <Kpi label="Outstanding invoices" value={money(kpis.invoicesPending)} />
        <Kpi label="Records" value={kpis.totalRecords.toLocaleString()} />
      </div>

      <div>
        <h3 className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Modules</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map((m) => {
            const def = getModule(m.kind);
            const Icon = def?.icon ?? Layers;
            const count = kpis.counts[m.kind] ?? 0;
            return (
              <button key={m.id} onClick={() => onOpen(m.id)} className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:shadow-card">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-gradient"><Icon className="h-5 w-5 text-white" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{m.title}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{def?.label ?? m.kind} · {def?.virtual ? "auto" : `${count} record${count === 1 ? "" : "s"}`}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{def?.description}</p>
                </div>
              </button>
            );
          })}
          <button onClick={onAdd} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground transition hover:bg-accent">
            <Plus className="h-4 w-4" /> Add module
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </Card>
  );
}

function ModulePanel({ projectId, module: mod }: { projectId: string; module: Module }) {
  const def = resolveModuleDef(mod.kind, mod.config);
  const qc = useQueryClient();
  const lr = useServerFn(listRecords);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["records", mod.id],
    queryFn: () => lr({ data: { moduleId: mod.id } }),
  });

  const [editing, setEditing] = useState<Record_ | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const up = useServerFn(upsertRecord);
  const del = useServerFn(deleteRecord);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["records", mod.id] }); };

  const onSubmit = async (values: Record<string, unknown>) => {
    await up({ data: { id: editing?.id, moduleId: mod.id, projectId, kind: mod.kind, data: values } });
    invalidate();
    toast.success("Saved");
  };

  const remove = async (rid: string) => {
    if (!confirm("Delete this record?")) return;
    await del({ data: { id: rid } });
    invalidate();
    toast.success("Deleted");
  };

  if (!def) return <Card className="p-6">Unknown module</Card>;
  if (def.virtual) return <DashboardPanel projectId={projectId} kind={mod.kind} title={mod.title} />;

  const statusField = def.fields.find((f) => f.key === "status" || f.key === "stage");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = (rows as Record_[]).filter((r) => {
      const d = r.data as Record<string, unknown>;
      if (statusFilter && String(d[statusField?.key ?? ""] ?? "") !== statusFilter) return false;
      if (!q) return true;
      return JSON.stringify(d).toLowerCase().includes(q);
    });
    if (sort) {
      const { key, dir } = sort;
      out = [...out].sort((a, b) => {
        const av = (a.data as Record<string, unknown>)[key];
        const bv = (b.data as Record<string, unknown>)[key];
        const an = typeof av === "number" ? av : String(av ?? "").toLowerCase();
        const bn = typeof bv === "number" ? bv : String(bv ?? "").toLowerCase();
        if (an < bn) return dir === "asc" ? -1 : 1;
        if (an > bn) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, query, statusFilter, statusField, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const toggleSort = (key: string) => {
    setPage(1);
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  };

  const Icon = def.icon;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-gradient"><Icon className="h-5 w-5 text-white" /></div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg">{mod.title}</h2>
              <p className="truncate text-xs text-muted-foreground">{def.description}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setAdding(true); }} className="bg-brand-gradient text-white">
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            placeholder={`Search ${def.label.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          {statusField?.options && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter status"
            >
              <option value="">All {statusField.label.toLowerCase()}</option>
              {statusField.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>
        </div>
      </Card>

      {isLoading ? (
        <Card className="h-40 animate-pulse bg-muted" />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center">
          <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No {def.label.toLowerCase()} yet.</p>
          <Button size="sm" className="mt-4 bg-brand-gradient text-white" onClick={() => { setEditing(null); setAdding(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add first
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No matches. Try clearing the search or filter.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {def.listColumns.map((c) => {
                  const label = def.fields.find((f) => f.key === c)?.label ?? c;
                  const arrow = sort?.key === c ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
                  return (
                    <TableHead key={c} onClick={() => toggleSort(c)} className="cursor-pointer select-none">
                      {label}{arrow}
                    </TableHead>
                  );
                })}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const d = r.data as Record<string, unknown>;
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setEditing(r); setAdding(false); }}>
                    {def.listColumns.map((c) => (
                      <TableCell key={c} className="max-w-[220px] truncate">{renderCell(d[c])}</TableCell>
                    ))}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(r); setAdding(false); }}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-border p-3 text-sm text-muted-foreground">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Prev</Button>
              <span>Page {currentPage} of {pageCount}</span>
              <Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
            </div>
          )}
        </Card>
      )}

      <RecordDialog
        open={adding || !!editing}
        onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}
        kind={mod.kind}
        config={mod.config}
        initial={editing ? (editing.data as Record<string, unknown>) : null}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function renderCell(v: unknown) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    return <span className="flex flex-wrap gap-1">{v.map((x, i) => <Badge key={i} variant="secondary" className="text-[10px]">{String(x)}</Badge>)}</span>;
  }
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function DashboardPanel({ projectId, kind, title }: { projectId: string; kind: string; title: string }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["dashboard-records", projectId],
    queryFn: async () => (await supabase.from("module_records").select("kind, data, created_at").eq("project_id", projectId)).data ?? [],
  });

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let revenue = 0, expenses = 0, pending = 0, overdue = 0;
    const recent: Array<{ kind: string; label: string; when: string }> = [];
    for (const r of rows) {
      counts[r.kind] = (counts[r.kind] ?? 0) + 1;
      const d = (r.data ?? {}) as Record<string, unknown>;
      const key = amountKey(r.kind);
      const val = key ? Number(d[key] ?? 0) : 0;
      if (r.kind === "invoices") {
        if (d.status === "paid") revenue += val;
        else if (d.status === "overdue") overdue += val;
        else if (d.status !== "void" && d.status !== "draft") pending += val;
      } else if (r.kind === "payments" || r.kind === "sales" || r.kind === "orders") revenue += val;
      else if (r.kind === "expenses" || r.kind === "purchases") expenses += val;
      recent.push({
        kind: r.kind,
        label: String(d.name ?? d.title ?? d.customer ?? d.number ?? d.reference ?? d.description ?? "Record"),
        when: r.created_at,
      });
    }
    recent.sort((a, b) => b.when.localeCompare(a.when));
    return { counts, revenue, expenses, pending, overdue, recent: recent.slice(0, 8), total: rows.length };
  }, [rows]);

  const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const entries = Object.entries(stats.counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-display text-lg">{title}</h2>
        <p className="text-xs text-muted-foreground">Live KPIs computed from every record in this workspace.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue" value={money(stats.revenue)} />
        <Kpi label="Expenses" value={money(stats.expenses)} />
        <Kpi label={kind === "reports" ? "Overdue" : "Outstanding"} value={money(kind === "reports" ? stats.overdue : stats.pending)} />
        <Kpi label="Total records" value={stats.total.toLocaleString()} />
      </div>

      <Card className="p-5">
        <h3 className="font-display text-base">Records per module</h3>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No data yet — add records in any module.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map(([k, v]) => {
              const def = MODULE_CATALOG[k as ModuleKind];
              const max = entries[0][1] || 1;
              const pct = Math.round((v / max) * 100);
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{def?.label ?? k}</span>
                    <span className="text-muted-foreground">{v}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-base">Recent activity</h3>
        {stats.recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {stats.recent.map((r, i) => {
              const def = MODULE_CATALOG[r.kind as ModuleKind];
              const Icon = def?.icon ?? Layers;
              return (
                <li key={i} className="flex items-center gap-3 py-2 text-sm">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-muted"><Icon className="h-4 w-4 text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{def?.label ?? r.kind} · {new Date(r.when).toLocaleString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
