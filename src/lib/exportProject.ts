import JSZip from "jszip";
import type { Tables } from "@/integrations/supabase/types";
import { getModule, type ModuleDef, type ModuleField } from "./modules";
import { deploymentMarkdown, type RuntimeNeeds } from "./deployment";
import { DEFAULT_SETTINGS, type AppSettings } from "./appRuntime";

type Project = Tables<"projects">;
type Module = Tables<"project_modules">;
type Rec = Tables<"module_records">;

export type ExportInput = {
  project: Project;
  modules: Module[];
  records: Rec[];
};

export type FileMap = Record<string, string>;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function slugify(s: string) {
  return (s || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "app";
}
const tableName = (kind: string) => kind.replace(/[^a-z0-9_]/g, "_");
const j = (v: unknown) => JSON.stringify(v, null, 2);

const CATALOG_KINDS = new Set([
  "products", "menu", "services", "courses", "events", "properties",
  "vehicles", "rooms", "plans", "portfolio", "blog",
]);

function settingsOf(modules: Module[]): AppSettings {
  const cfg = (modules.find((m) => m.kind === "settings")?.config ?? {}) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...cfg };
}

function usableModules(modules: Module[]) {
  return modules
    .map((m) => ({ m, def: getModule(m.kind) }))
    .filter((x): x is { m: Module; def: ModuleDef } => !!x.def && !x.def.virtual && x.def.fields.length > 0);
}

export function runtimeNeeds(input: ExportInput): RuntimeNeeds {
  const publicSite = input.project.is_public && usableModules(input.modules).some((x) => CATALOG_KINDS.has(x.m.kind));
  return { server: publicSite, database: true, publicSite, nodeVersion: "20" };
}

/* ------------------------------------------------------------------ */
/* database                                                            */
/* ------------------------------------------------------------------ */

function sqlType(f: ModuleField) {
  switch (f.type) {
    case "number": return "numeric";
    case "boolean": return "boolean";
    case "date": return "date";
    case "datetime": return "timestamptz";
    case "tags": return "text[]";
    default: return "text";
  }
}

function sqlLiteral(f: ModuleField, v: unknown): string {
  if (v === undefined || v === null || v === "") return "null";
  if (f.type === "number") { const n = Number(v); return Number.isFinite(n) ? String(n) : "null"; }
  if (f.type === "boolean") return v ? "true" : "false";
  if (f.type === "tags") {
    const arr = Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim()).filter(Boolean);
    return `ARRAY[${arr.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(",")}]::text[]`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function migrationSql(input: ExportInput): string {
  const out: string[] = [
    `-- ${input.project.name} — schema`,
    "-- Generated from your application configuration. Safe to re-run.",
    "create extension if not exists pgcrypto;",
    "",
  ];
  for (const { m, def } of usableModules(input.modules)) {
    const tbl = tableName(m.kind);
    out.push(`-- ${m.title}`);
    out.push(`create table if not exists public.${tbl} (`);
    out.push("  id uuid primary key default gen_random_uuid(),");
    out.push("  user_id uuid not null references auth.users(id) on delete cascade,");
    for (const f of def.fields) out.push(`  ${f.key} ${sqlType(f)},`);
    out.push("  created_at timestamptz not null default now(),");
    out.push("  updated_at timestamptz not null default now()");
    out.push(");");
    out.push(`grant select, insert, update, delete on public.${tbl} to authenticated;`);
    out.push(`grant all on public.${tbl} to service_role;`);
    out.push(`alter table public.${tbl} enable row level security;`);
    out.push(`drop policy if exists "${tbl}_own" on public.${tbl};`);
    out.push(`create policy "${tbl}_own" on public.${tbl} for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);`);
    out.push(`create index if not exists ${tbl}_user_idx on public.${tbl}(user_id);`);
    out.push("");
  }
  return out.join("\n");
}

export function seedSql(input: ExportInput): string {
  const out: string[] = [
    `-- ${input.project.name} — seed data`,
    "-- Set the owner first, then run this file:",
    "--   \\set seed_user_id 'YOUR-AUTH-USER-UUID'",
    "",
  ];
  for (const { m, def } of usableModules(input.modules)) {
    const rows = input.records.filter((r) => r.module_id === m.id);
    if (!rows.length) continue;
    const tbl = tableName(m.kind);
    out.push(`-- ${rows.length} rows for ${tbl}`);
    for (const r of rows) {
      const data = (r.data ?? {}) as Record<string, unknown>;
      const cols = def.fields.map((f) => f.key).join(", ");
      const vals = def.fields.map((f) => sqlLiteral(f, data[f.key])).join(", ");
      out.push(`insert into public.${tbl} (user_id, ${cols}) values (:'seed_user_id', ${vals});`);
    }
    out.push("");
  }
  if (out.length === 4) out.push("-- (no seed rows — the application starts empty)");
  return out.join("\n");
}

export function schemaJson(input: ExportInput) {
  return j({
    application: input.project.name,
    generatedAt: new Date().toISOString(),
    tables: usableModules(input.modules).map(({ m, def }) => ({
      table: tableName(m.kind),
      label: m.title,
      rowLevelSecurity: "owner only (auth.uid() = user_id)",
      columns: def.fields.map((f) => ({ name: f.key, type: sqlType(f), required: !!f.required })),
    })),
  });
}

/* ------------------------------------------------------------------ */
/* configuration                                                       */
/* ------------------------------------------------------------------ */

export function appConfigJson(input: ExportInput) {
  const s = settingsOf(input.modules);
  return j({
    name: s.businessName || input.project.name,
    tagline: s.tagline || input.project.description || "",
    description: input.project.description ?? "",
    currency: s.currency,
    timezone: s.timezone,
    language: s.language,
    contact: { email: s.email, phone: s.phone, address: s.address },
    publicWebsite: input.project.is_public,
    pages: input.modules.map((m) => ({ kind: m.kind, title: m.title, position: m.position })),
  });
}

function appConfigTs(input: ExportInput) {
  return `// Business configuration for this application. Edit freely — no platform code depends on it.
export const appConfig = ${appConfigJson(input)} as const;

export type AppConfig = typeof appConfig;
`;
}

function modulesTs(input: ExportInput) {
  const mods = usableModules(input.modules).map(({ m, def }) => ({
    kind: m.kind,
    table: tableName(m.kind),
    label: m.title || def.label,
    description: def.description,
    fields: def.fields,
    listColumns: def.listColumns,
    catalog: CATALOG_KINDS.has(m.kind),
  }));
  return `// Data model of this application: one entry per page/table.
export type FieldType =
  | "text" | "textarea" | "number" | "date" | "datetime"
  | "select" | "tags" | "boolean" | "url";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
};

export type ModuleDef = {
  kind: string;
  table: string;
  label: string;
  description: string;
  fields: Field[];
  listColumns: string[];
  catalog: boolean;
};

export const MODULES: ModuleDef[] = ${j(mods)};

export const moduleByKind = (kind: string): ModuleDef | undefined =>
  MODULES.find((m) => m.kind === kind);
`;
}

export function projectFilesJson(input: ExportInput) {
  return j({
    exportedAt: new Date().toISOString(),
    project: {
      id: input.project.id,
      name: input.project.name,
      description: input.project.description,
      prompt: input.project.prompt,
      isPublic: input.project.is_public,
    },
    modules: input.modules.map((m) => ({ kind: m.kind, title: m.title, position: m.position, config: m.config })),
    records: input.records.map((r) => ({ kind: r.kind, data: r.data, createdAt: r.created_at })),
  });
}

export function envTemplate(needs: RuntimeNeeds) {
  return `# Environment configuration for the exported application.
# Copy to .env.local for local development, or paste into your host's settings.
# NEVER commit real values.

# Supabase project (Settings -> API in your own Supabase project)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only key. Required only if you add admin/server logic. Never expose to the browser.
SUPABASE_SERVICE_ROLE_KEY=

# Public site base URL (used for metadata/canonical links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
${needs.publicSite ? "\n# This build includes a public customer website, so a Node/edge server is required.\n" : ""}`;
}

/* ------------------------------------------------------------------ */
/* application source                                                  */
/* ------------------------------------------------------------------ */

const SERVICE_SUPABASE = `import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
`;

const SERVICE_RECORDS = `import { supabaseClient } from "./supabase";
import type { ModuleDef } from "@/modules/registry";

export type Row = Record<string, unknown> & { id: string };

export async function listRecords(mod: ModuleDef): Promise<Row[]> {
  const { data, error } = await supabaseClient()
    .from(mod.table)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

export async function createRecord(mod: ModuleDef, values: Record<string, unknown>): Promise<Row> {
  const supabase = supabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from(mod.table)
    .insert({ ...values, user_id: auth.user?.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Row;
}

export async function updateRecord(mod: ModuleDef, id: string, values: Record<string, unknown>): Promise<Row> {
  const { data, error } = await supabaseClient()
    .from(mod.table)
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Row;
}

export async function deleteRecord(mod: ModuleDef, id: string): Promise<void> {
  const { error } = await supabaseClient().from(mod.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function countRecords(mod: ModuleDef): Promise<number> {
  const { count } = await supabaseClient().from(mod.table).select("*", { count: "exact", head: true });
  return count ?? 0;
}
`;

const HOOK_RECORDS = `"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRecord, deleteRecord, listRecords, updateRecord, type Row,
} from "@/services/records";
import type { ModuleDef } from "@/modules/registry";

export function useRecords(mod: ModuleDef | undefined) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!mod) return;
    setLoading(true);
    try {
      setRows(await listRecords(mod));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }, [mod]);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(
    async (values: Record<string, unknown>, id?: string) => {
      if (!mod) return;
      if (id) {
        const next = await updateRecord(mod, id, values);
        setRows((s) => s.map((r) => (r.id === id ? next : r)));
      } else {
        const next = await createRecord(mod, values);
        setRows((s) => [next, ...s]);
      }
    },
    [mod],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!mod) return;
      await deleteRecord(mod, id);
      setRows((s) => s.filter((r) => r.id !== id));
    },
    [mod],
  );

  return { rows, loading, error, reload, save, remove };
}
`;

const UTIL_FORMAT = `import { appConfig } from "@/config/app.config";

export function formatMoney(value: unknown): string {
  const n = Number(value ?? 0) || 0;
  try {
    return n.toLocaleString(undefined, { style: "currency", currency: appConfig.currency });
  } catch {
    return \`\${appConfig.currency} \${n.toFixed(2)}\`;
  }
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
`;

const UTIL_VALIDATE = `import type { Field } from "@/modules/registry";

export function validateRecord(fields: Field[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.key];
    const empty = v === undefined || v === null || v === "";
    if (f.required && empty) { errors[f.key] = \`\${f.label} is required\`; continue; }
    if (empty) continue;
    if (f.type === "number" && !Number.isFinite(Number(v))) errors[f.key] = \`\${f.label} must be a number\`;
    if (f.key.includes("email") && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v))) errors[f.key] = "Enter a valid email";
    if (f.type === "url" && !/^https?:\\/\\//.test(String(v))) errors[f.key] = "Enter a URL starting with http";
  }
  return errors;
}
`;

const COMPONENT_EMPTY = `type Props = { title: string; hint: string; actionLabel: string; onAction: () => void };

export function EmptyState({ title, hint, actionLabel, onAction }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        {actionLabel}
      </button>
    </div>
  );
}
`;

const COMPONENT_FORM = `"use client";

import { useState } from "react";
import type { Field } from "@/modules/registry";
import { validateRecord } from "@/utils/validate";

type Props = {
  fields: Field[];
  initial?: Record<string, unknown>;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
};

export function RecordForm({ fields, initial, submitLabel, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(initial ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: unknown) => setValues((s) => ({ ...s, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateRecord(fields, values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try { await onSubmit(values); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      {fields.map((f) => (
        <label key={f.key} className="block text-sm">
          <span className="mb-1 block text-slate-500">{f.label}{f.required ? " *" : ""}</span>
          {f.type === "textarea" ? (
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={String(values[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : f.type === "select" ? (
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={String(values[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            >
              <option value="">Select…</option>
              {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === "boolean" ? (
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={Boolean(values[f.key])}
              onChange={(e) => set(f.key, e.target.checked)}
            />
          ) : (
            <input
              type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={String(values[f.key] ?? "")}
              onChange={(e) => set(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
            />
          )}
          {errors[f.key] ? <span className="mt-1 block text-xs text-red-600">{errors[f.key]}</span> : null}
        </label>
      ))}
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
`;

const COMPONENT_TABLE = `"use client";

import type { ModuleDef } from "@/modules/registry";
import type { Row } from "@/services/records";
import { formatValue } from "@/utils/format";

type Props = {
  mod: ModuleDef;
  rows: Row[];
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
};

export function RecordTable({ mod, rows, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            {mod.listColumns.map((c) => {
              const field = mod.fields.find((f) => f.key === c);
              return <th key={c} className="p-3 font-medium">{field?.label ?? c}</th>;
            })}
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              {mod.listColumns.map((c) => <td key={c} className="p-3">{formatValue(r[c])}</td>)}
              <td className="p-3 text-right whitespace-nowrap">
                <button className="mr-3 text-slate-700 hover:underline" onClick={() => onEdit(r)}>Edit</button>
                <button className="text-red-600 hover:underline" onClick={() => onDelete(r)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;

const PAGE_MODULE = `"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { moduleByKind } from "@/modules/registry";
import { useRecords } from "@/hooks/useRecords";
import { RecordForm } from "@/components/RecordForm";
import { RecordTable } from "@/components/RecordTable";
import { EmptyState } from "@/components/EmptyState";
import type { Row } from "@/services/records";

export default function ModulePage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = use(params);
  const mod = useMemo(() => moduleByKind(kind), [kind]);
  const { rows, loading, error, save, remove } = useRecords(mod);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  if (!mod) {
    return (
      <div className="p-10">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <Link className="mt-3 inline-block text-slate-600 underline" href="/">Back to dashboard</Link>
      </div>
    );
  }

  const filtered = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(query.trim().toLowerCase()));

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (row: Row) => { setEditing(row); setFormOpen(true); };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{mod.label}</h1>
          <p className="text-sm text-slate-500">{mod.description}</p>
        </div>
        <input
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          placeholder={\`Search \${mod.label.toLowerCase()}…\`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={openNew} className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">
          Add {mod.label.replace(/s$/, "")}
        </button>
      </header>

      {formOpen ? (
        <div className="mb-6">
          <RecordForm
            key={editing?.id ?? "new"}
            fields={mod.fields}
            initial={editing ?? undefined}
            submitLabel={editing ? "Update" : "Create"}
            onCancel={() => setFormOpen(false)}
            onSubmit={async (values) => {
              await save(values, editing?.id);
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? "No matches" : \`No \${mod.label.toLowerCase()} yet\`}
          hint={query ? "Try a different search." : \`Add your first \${mod.label.replace(/s$/, "").toLowerCase()} to get started.\`}
          actionLabel={\`Add \${mod.label.replace(/s$/, "")}\`}
          onAction={openNew}
        />
      ) : (
        <RecordTable
          mod={mod}
          rows={filtered}
          onEdit={openEdit}
          onDelete={(row) => { if (confirm("Delete this record?")) void remove(row.id); }}
        />
      )}
    </div>
  );
}
`;

const PAGE_DASHBOARD = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULES } from "@/modules/registry";
import { countRecords } from "@/services/records";
import { appConfig } from "@/config/app.config";

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const m of MODULES) {
        try {
          const c = await countRecords(m);
          if (!cancelled) setCounts((s) => ({ ...s, [m.kind]: c }));
        } catch {
          if (!cancelled) setCounts((s) => ({ ...s, [m.kind]: null }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">{appConfig.name}</h1>
      <p className="text-sm text-slate-500">{appConfig.tagline || "Business dashboard"}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <Link key={m.kind} href={\`/m/\${m.kind}\`} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400">
            <p className="text-xs uppercase tracking-wide text-slate-500">{m.label}</p>
            <p className="mt-2 text-3xl font-semibold">{counts[m.kind] ?? "—"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
`;

function layoutTsx(input: ExportInput) {
  const s = settingsOf(input.modules);
  const name = s.businessName || input.project.name;
  return `import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { MODULES } from "@/modules/registry";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
  title: ${JSON.stringify(name)},
  description: ${JSON.stringify(s.tagline || input.project.description || `${name} business application`)},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="${s.language || "en"}">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
            <p className="mb-5 px-2 text-sm font-semibold">{appConfig.name}</p>
            <nav className="space-y-1 text-sm">
              <Link className="block rounded-lg px-3 py-2 hover:bg-slate-100" href="/">Dashboard</Link>
              {MODULES.map((m) => (
                <Link key={m.kind} className="block rounded-lg px-3 py-2 hover:bg-slate-100" href={\`/m/\${m.kind}\`}>
                  {m.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
`;
}

function siteHomeTsx(input: ExportInput) {
  const s = settingsOf(input.modules);
  const name = s.businessName || input.project.name;
  return `import Link from "next/link";
import { MODULES } from "@/modules/registry";

export const metadata = {
  title: ${JSON.stringify(`${name} — welcome`)},
  description: ${JSON.stringify(s.tagline || `Browse and order from ${name}.`)},
};

export default function SiteHome() {
  const catalog = MODULES.filter((m) => m.catalog);
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-4xl font-semibold">{${JSON.stringify(name)}}</h1>
      <p className="mt-3 max-w-xl text-slate-600">{${JSON.stringify(s.tagline || "")}}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        {catalog.map((m) => (
          <Link key={m.kind} href={\`/site/\${m.kind}\`} className="rounded-full bg-slate-900 px-6 py-3 text-sm text-white">
            View {m.label}
          </Link>
        ))}
      </div>
      <address className="mt-16 not-italic text-sm text-slate-500">
        {${JSON.stringify(s.address)}}<br />
        {${JSON.stringify(s.phone)}} {${JSON.stringify(s.email)}}
      </address>
    </main>
  );
}
`;
}

const SITE_CATALOG = `"use client";

import { use, useEffect, useState } from "react";
import { moduleByKind } from "@/modules/registry";
import { listRecords, type Row } from "@/services/records";
import { formatMoney, formatValue } from "@/utils/format";

export default function SiteCatalog({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = use(params);
  const mod = moduleByKind(kind);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!mod) return;
    listRecords(mod).then(setRows).catch(() => setRows([]));
  }, [mod]);

  if (!mod) return <main className="p-10">Not found.</main>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{mod.label}</h1>
      {rows.length === 0 ? (
        <p className="mt-6 text-slate-500">Nothing published yet — please check back soon.</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-medium">{formatValue(r["name"] ?? r["title"] ?? r["item"])}</p>
              <p className="mt-1 text-sm text-slate-500">{formatValue(r["description"] ?? r["category"])}</p>
              {r["price"] !== undefined ? <p className="mt-3 font-semibold">{formatMoney(r["price"])}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
`;

/* ------------------------------------------------------------------ */
/* assets                                                              */
/* ------------------------------------------------------------------ */

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "AP";
  return ((p[0]?.[0] ?? "A") + (p[1]?.[0] ?? p[0]?.[1] ?? "P")).toUpperCase();
}

export function assetFiles(input: ExportInput): FileMap {
  const s = settingsOf(input.modules);
  const name = s.businessName || input.project.name;
  const initials = (s.logoText?.trim() || initialsOf(name)).slice(0, 3).toUpperCase();
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${name} logo">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#06b6d4"/>
  </linearGradient></defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <text x="64" y="80" font-family="system-ui,sans-serif" font-size="46" font-weight="600" fill="#fff" text-anchor="middle">${initials}</text>
</svg>
`;
  return {
    "public/logo.svg": logo,
    "public/icon.svg": logo,
    "public/brand.json": j({ name, initials, primary: "#4f46e5", accent: "#06b6d4", currency: s.currency }),
    "public/robots.txt": `User-agent: *\nAllow: /\n`,
  };
}

/* ------------------------------------------------------------------ */
/* full project                                                        */
/* ------------------------------------------------------------------ */

export function buildProjectFiles(input: ExportInput): FileMap {
  const needs = runtimeNeeds(input);
  const s = settingsOf(input.modules);
  const name = s.businessName || input.project.name;
  const pkgName = slugify(name);
  const mods = usableModules(input.modules);

  const files: FileMap = {
    "package.json": j({
      name: pkgName,
      private: true,
      version: "1.0.0",
      engines: { node: ">=20" },
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@supabase/ssr": "^0.5.2",
        "@supabase/supabase-js": "^2.45.0",
        next: "^15.5.24",
        react: "19.0.0",
        "react-dom": "19.0.0",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        autoprefixer: "^10.4.20",
        postcss: "^8.4.47",
        tailwindcss: "^3.4.14",
        typescript: "^5.6.0",
        ...(needs.publicSite ? { "@opennextjs/cloudflare": "^1.20.0", wrangler: "^4.0.0" } : {}),
      },
    }),
    "tsconfig.json": j({
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        strict: true,
        noEmit: true,
        jsx: "preserve",
        module: "esnext",
        moduleResolution: "bundler",
        skipLibCheck: true,
        allowJs: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        isolatedModules: true,
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }),
    "next.config.mjs": `/** @type {import('next').NextConfig} */\nconst nextConfig = { reactStrictMode: true };\nexport default nextConfig;\n`,
    "postcss.config.mjs": `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`,
    "tailwind.config.ts": `import type { Config } from "tailwindcss";\n\nexport default {\n  content: ["./src/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n} satisfies Config;\n`,
    "environment.example": envTemplate(needs),
    ".env.example": envTemplate(needs),
    ".gitignore": `node_modules\n.next\nout\n.env\n.env.local\n.open-next\n.wrangler\n`,
    "vercel.json": j({ framework: "nextjs", buildCommand: "next build", installCommand: "npm install" }),
    "netlify.toml": `[build]\n  command = "next build"\n  publish = ".next"\n\n[[plugins]]\n  package = "@netlify/plugin-nextjs"\n`,
    "Dockerfile": `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]
`,
    "docker-compose.yml": `services:\n  web:\n    build: .\n    ports: ["3000:3000"]\n    env_file: .env\n`,
    ".github/workflows/ci.yml": `name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: npm }
      - run: npm install
      - run: npm run typecheck
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
`,
    "database/migrations/0001_init.sql": migrationSql(input),
    "database/seed.sql": seedSql(input),
    "database/schema.json": schemaJson(input),
    "database/README.md": `# Database\n\n1. Create a Supabase project.\n2. Run \`migrations/0001_init.sql\`.\n3. Set \`\\set seed_user_id 'YOUR-UUID'\` and run \`seed.sql\` if you want the starter data.\n\nEvery table is protected by row-level security scoped to \`auth.uid()\`.\n`,
    "src/config/app.config.ts": appConfigTs(input),
    "src/modules/registry.ts": modulesTs(input),
    "src/services/supabase.ts": SERVICE_SUPABASE,
    "src/services/records.ts": SERVICE_RECORDS,
    "src/hooks/useRecords.ts": HOOK_RECORDS,
    "src/utils/format.ts": UTIL_FORMAT,
    "src/utils/validate.ts": UTIL_VALIDATE,
    "src/components/EmptyState.tsx": COMPONENT_EMPTY,
    "src/components/RecordForm.tsx": COMPONENT_FORM,
    "src/components/RecordTable.tsx": COMPONENT_TABLE,
    "src/app/globals.css": `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    "src/app/layout.tsx": layoutTsx(input),
    "src/app/page.tsx": PAGE_DASHBOARD,
    "src/app/m/[kind]/page.tsx": PAGE_MODULE,
    "DEPLOYMENT.md": deploymentMarkdown(name, needs),
    ...assetFiles(input),
  };

  if (needs.publicSite) {
    files["src/app/site/page.tsx"] = siteHomeTsx(input);
    files["src/app/site/[kind]/page.tsx"] = SITE_CATALOG;
    files["wrangler.toml"] = `name = "${pkgName}"\nmain = ".open-next/worker.js"\ncompatibility_date = "2025-03-01"\ncompatibility_flags = ["nodejs_compat"]\n\n[assets]\ndirectory = ".open-next/assets"\nbinding = "ASSETS"\n`;
    files["open-next.config.ts"] = `import { defineCloudflareConfig } from "@opennextjs/cloudflare";\n\nexport default defineCloudflareConfig();\n`;
  }

  files["README.md"] = `# ${name}

${s.tagline || input.project.description || ""}

This is **your** application. It was generated by BuildFlow AI and is now a standalone
Next.js 15 + TypeScript + Tailwind + Supabase project with no dependency on BuildFlow.

## Structure

\`\`\`
src/
  app/         routes and pages (Next.js App Router)
  components/  reusable UI (tables, forms, empty states)
  modules/     the data model of this business (registry.ts)
  services/    data access (Supabase client + record CRUD)
  hooks/       React data hooks
  utils/       formatting and validation helpers
  config/      business configuration (name, currency, contact)
database/      SQL schema, RLS policies and seed data
\`\`\`

## Pages

${mods.map((x) => `- **${x.m.title}** — \`/m/${x.m.kind}\` (table \`${tableName(x.m.kind)}\`)`).join("\n")}
${needs.publicSite ? `- **Customer website** — \`/site\`\n` : ""}
## Getting started

\`\`\`bash
npm install
cp environment.example .env.local   # add your own Supabase URL + anon key
npm run dev
\`\`\`

Then apply \`database/migrations/0001_init.sql\` to your Supabase project.

## Scripts

| Script | Purpose |
| --- | --- |
| \`npm run dev\` | local development on http://localhost:3000 |
| \`npm run typecheck\` | TypeScript validation |
| \`npm run build\` | production build |
| \`npm start\` | run the production server |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel, Netlify, Cloudflare, Node hosts,
Hostinger and GoDaddy instructions, including which of them can actually run this app.

## Security

No BuildFlow credentials are included in this export. Environment variables are
placeholders in \`environment.example\`; add your own values in your host.
`;

  return files;
}

/* ------------------------------------------------------------------ */
/* download helpers                                                    */
/* ------------------------------------------------------------------ */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function zipDownload(files: FileMap, folder: string, filename: string) {
  const zip = new JSZip();
  const root = zip.folder(folder)!;
  for (const [path, content] of Object.entries(files)) root.file(path, content);
  download(await zip.generateAsync({ type: "blob" }), filename);
}

export type ExportKind =
  | "source" | "project" | "database" | "environment" | "config" | "assets" | "deployment";

export async function runExport(kind: ExportKind, input: ExportInput) {
  const base = slugify(settingsOf(input.modules).businessName || input.project.name);
  switch (kind) {
    case "source":
      return zipDownload(buildProjectFiles(input), base, `${base}-source.zip`);
    case "project":
      return download(new Blob([projectFilesJson(input)], { type: "application/json" }), `${base}-project.json`);
    case "database":
      return zipDownload(
        {
          "migrations/0001_init.sql": migrationSql(input),
          "seed.sql": seedSql(input),
          "schema.json": schemaJson(input),
        },
        `${base}-database`,
        `${base}-database.zip`,
      );
    case "environment":
      return download(new Blob([envTemplate(runtimeNeeds(input))], { type: "text/plain" }), "environment.example");
    case "config":
      return download(new Blob([appConfigJson(input)], { type: "application/json" }), `${base}-app-config.json`);
    case "assets":
      return zipDownload(assetFiles(input), `${base}-assets`, `${base}-assets.zip`);
    case "deployment":
      return download(
        new Blob([deploymentMarkdown(settingsOf(input.modules).businessName || input.project.name, runtimeNeeds(input))], {
          type: "text/markdown",
        }),
        "DEPLOYMENT.md",
      );
  }
}

/** Legacy entry point kept so existing buttons keep working. */
export async function downloadSourceProject(project: Project | null, modules: Module[], records: Rec[]) {
  if (!project) throw new Error("Application not found");
  await runExport("source", { project, modules, records });
}
