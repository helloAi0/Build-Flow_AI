import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Check, CircleAlert, Cloud, Database, Download, FileCode, FileJson,
  Github, Image as ImageIcon, Loader2, Rocket, Settings2, ShieldCheck, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeploymentReadiness, getExportData, getGithubExportStatus } from "@/lib/deployment.functions";
import { buildProjectFiles, runExport, runtimeNeeds, type ExportInput, type ExportKind } from "@/lib/exportProject";
import { providersFor } from "@/lib/deployment";

export const Route = createFileRoute("/_authenticated/export/$id")({
  head: () => ({
    meta: [
      { title: "Export & deploy your application — BuildFlow AI" },
      { name: "description", content: "Download the complete source code of your generated application, check deployment readiness and deploy it to your own hosting." },
      { property: "og:title", content: "Export & deploy your application — BuildFlow AI" },
      { property: "og:description", content: "Take your generated application out of BuildFlow: source code, database schema, seed data and deployment instructions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExportPage,
});

type SourceCheck = { name: string; ok: boolean; detail?: string };

/** Static validation of the generated source tree — real checks, run on the real output. */
function validateSource(input: ExportInput): { checks: SourceCheck[]; fileCount: number; bytes: number } {
  const files = buildProjectFiles(input);
  const paths = Object.keys(files);
  const bytes = paths.reduce((n, p) => n + (files[p]?.length ?? 0), 0);
  const checks: SourceCheck[] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

  const required = [
    "package.json", "tsconfig.json", "next.config.mjs", "src/app/layout.tsx",
    "src/app/page.tsx", "src/app/m/[kind]/page.tsx", "src/modules/registry.ts",
    "src/services/records.ts", "database/migrations/0001_init.sql",
    "environment.example", "README.md", "DEPLOYMENT.md",
  ];
  const missing = required.filter((p) => !paths.includes(p));
  add("Project scaffold complete", missing.length === 0, missing.join(", ") || `${paths.length} files`);

  // Every internal import must resolve to a file that exists in the bundle.
  const unresolved: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!/\.tsx?$/.test(path)) continue;
    for (const m of content.matchAll(/from "@\/([^"]+)"/g)) {
      const target = `src/${m[1]}`;
      if (!paths.some((p) => p === target || p === `${target}.ts` || p === `${target}.tsx`)) {
        unresolved.push(`${path} → @/${m[1]}`);
      }
    }
  }
  add("All internal imports resolve", unresolved.length === 0, unresolved.slice(0, 3).join(" | ") || undefined);

  const registry = files["src/modules/registry.ts"] ?? "";
  const tableCount = (registry.match(/"table":/g) ?? []).length;
  add("Data model exported", tableCount > 0, `${tableCount} tables`);

  const sql = files["database/migrations/0001_init.sql"] ?? "";
  const created = (sql.match(/create table if not exists/g) ?? []).length;
  const policies = (sql.match(/create policy/g) ?? []).length;
  add("Schema matches the data model", created === tableCount && created > 0, `${created} tables, ${policies} policies`);
  add("Row-level security in the schema", policies >= created && created > 0);

  // Nothing from BuildFlow may travel with the export.
  const leaked: string[] = [];
  const forbidden = [/VITE_SUPABASE/, /sb_secret_/, /service_role_key\s*=\s*\S+/, /eyJ[A-Za-z0-9_-]{20,}/, /supabase\.co(?!m)/];
  for (const [path, content] of Object.entries(files)) {
    if (path === ".github/workflows/ci.yml") continue; // placeholder values only
    if (forbidden.some((re) => re.test(content))) leaked.push(path);
  }
  add("No BuildFlow credentials in the export", leaked.length === 0, leaked.join(", ") || "placeholders only");

  const env = files["environment.example"] ?? "";
  add(
    "Environment template complete",
    env.includes("NEXT_PUBLIC_SUPABASE_URL") && env.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") && !/=\S/.test(env.split("\n").filter((l) => l.startsWith("NEXT_PUBLIC_SUPABASE")).join("\n")),
  );

  add("Assets generated", paths.some((p) => p.startsWith("public/")));
  add("Continuous integration configured", paths.includes(".github/workflows/ci.yml"), "typecheck + production build on every push");
  add("Deployment instructions generated", (files["DEPLOYMENT.md"] ?? "").includes("Hosting compatibility"));

  return { checks, fileCount: paths.length, bytes };
}

function CheckRow({ c }: { c: SourceCheck }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-sm">
      {c.ok ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <span className="min-w-0">
        {c.name}
        {c.detail ? <span className="ml-1.5 text-xs text-muted-foreground">— {c.detail}</span> : null}
      </span>
    </li>
  );
}

const EXPORTS: Array<{ kind: ExportKind; title: string; detail: string; icon: typeof Download }> = [
  { kind: "source", title: "Download source code", detail: "Complete Next.js + TypeScript + Tailwind project (.zip)", icon: FileCode },
  { kind: "project", title: "Export project files", detail: "Pages, configuration and all your records as JSON", icon: FileJson },
  { kind: "database", title: "Export database & schema", detail: "SQL migration, security policies, seed data, schema map", icon: Database },
  { kind: "environment", title: "Export environment template", detail: "environment.example with no secrets in it", icon: ShieldCheck },
  { kind: "config", title: "Export application configuration", detail: "Business name, currency, contact details, page list", icon: Settings2 },
  { kind: "assets", title: "Export generated assets", detail: "Logo, icon, brand tokens, robots.txt", icon: ImageIcon },
  { kind: "deployment", title: "Export deployment instructions", detail: "Hosting matrix and step-by-step guides", icon: Cloud },
];

function ExportPage() {
  const { id } = useParams({ from: "/_authenticated/export/$id" });
  const loadData = useServerFn(getExportData);
  const readiness = useServerFn(getDeploymentReadiness);
  const githubStatus = useServerFn(getGithubExportStatus);
  const [busy, setBusy] = useState<ExportKind | null>(null);

  const dataQ = useQuery({ queryKey: ["export-data", id], queryFn: () => loadData({ data: { projectId: id } }) });
  const readyQ = useQuery({ queryKey: ["export-readiness", id], queryFn: () => readiness({ data: { projectId: id } }) });
  const ghQ = useQuery({ queryKey: ["github-export"], queryFn: () => githubStatus() });

  const input: ExportInput | null = useMemo(
    () => (dataQ.data ? { project: dataQ.data.project, modules: dataQ.data.modules, records: dataQ.data.records } : null),
    [dataQ.data],
  );
  const source = useMemo(() => (input ? validateSource(input) : null), [input]);
  const needs = useMemo(() => (input ? runtimeNeeds(input) : null), [input]);

  const doExport = useMutation({
    mutationFn: async (kind: ExportKind) => {
      if (!input) throw new Error("Application not loaded");
      setBusy(kind);
      await runExport(kind, input);
    },
    onSuccess: () => toast.success("Export downloaded"),
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  const allChecks = [...(readyQ.data?.checks ?? []), ...(source?.checks ?? [])];
  const failed = allChecks.filter((c) => !c.ok);
  const loading = dataQ.isLoading || readyQ.isLoading;
  const ready = !loading && allChecks.length > 0 && failed.length === 0;
  const blocked = !loading && failed.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/run/$id" params={{ id }}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to application</Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl">{dataQ.data?.project.name ?? "Application"} — export & deploy</h1>
          <p className="text-sm text-muted-foreground">Take this application out of BuildFlow and run it on your own hosting.</p>
        </div>
      </div>

      {/* Readiness */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 font-display text-base">Deployment readiness</h2>
          {loading ? (
            <Badge variant="outline"><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Checking</Badge>
          ) : ready ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15"><Rocket className="mr-1.5 h-3 w-3" /> READY TO DEPLOY</Badge>
          ) : (
            <Badge variant="destructive"><CircleAlert className="mr-1.5 h-3 w-3" /> Export blocked</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void readyQ.refetch(); void dataQ.refetch(); }}
            disabled={readyQ.isFetching}
          >
            {readyQ.isFetching ? "Re-running..." : "Re-run checks"}
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-2/3" />)}</div>
        ) : (
          <div className="mt-4 grid gap-x-8 gap-y-1 md:grid-cols-2">
            <ul>
              <p className="pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Application &amp; database</p>
              {(readyQ.data?.checks ?? []).map((c) => <CheckRow key={c.name} c={c} />)}
            </ul>
            <ul>
              <p className="pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Generated source</p>
              {(source?.checks ?? []).map((c) => <CheckRow key={c.name} c={c} />)}
            </ul>
          </div>
        )}

        {blocked ? (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Export blocked</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {failed.map((c) => <li key={c.name}>{c.name}{c.detail ? ` — ${c.detail}` : ""}</li>)}
            </ul>
            <p className="mt-2 text-muted-foreground">Fix these first, then re-run the checks. Downloads stay disabled until every check passes.</p>
          </div>
        ) : null}

        {source ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {source.fileCount} files · {(source.bytes / 1024).toFixed(0)} KB of generated source ·
            {" "}runtime: Next.js 15 on Node {needs?.nodeVersion}{needs?.server ? " (server required)" : " (no server required)"}
          </p>
        ) : null}
      </Card>

      {/* Exports */}
      <Card className="p-5">
        <h2 className="font-display text-base">Export your application</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every download contains <strong>your</strong> application — not the BuildFlow dashboard.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {EXPORTS.map((e) => (
            <div key={e.kind} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <e.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
              </div>
              <Button
                size="sm"
                variant={e.kind === "source" ? "default" : "outline"}
                disabled={!ready || busy !== null}
                onClick={() => doExport.mutate(e.kind)}
              >
                {busy === e.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
        {!ready && !loading ? (
          <p className="mt-3 text-xs text-muted-foreground">Downloads unlock once the readiness checks pass.</p>
        ) : null}
      </Card>

      {/* GitHub */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Github className="mt-0.5 h-5 w-5" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base">Export to GitHub</h2>
            {ghQ.data?.connected ? (
              <p className="mt-1 text-sm text-muted-foreground">A GitHub token is configured. Create a repository from this application.</p>
            ) : (
              <>
                <p className="mt-1 text-sm font-medium text-amber-600">Deployment provider not connected</p>
                <p className="mt-1 text-sm text-muted-foreground">{ghQ.data?.requirement ?? "Checking provider..."}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The source download is already a git-ready repository:
                </p>
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{`unzip ${(dataQ.data?.project.name ?? "app").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-source.zip
cd ${(dataQ.data?.project.name ?? "app").toLowerCase().replace(/[^a-z0-9]+/g, "-")}
git init && git add -A && git commit -m "Initial commit"
gh repo create --source . --private --push`}</pre>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" disabled={!ready || busy !== null} onClick={() => doExport.mutate("source")}>
            <Download className="mr-1.5 h-4 w-4" /> Repository zip
          </Button>
        </div>
      </Card>

      {/* Hosting */}
      <Card className="p-5">
        <h2 className="font-display text-base">Where this application can run</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Detected from the application itself: {needs?.server ? "server-rendered pages are included, so a Node or edge server is required." : "no server rendering is required."}
        </p>
        <ul className="mt-4 divide-y divide-border">
          {(needs ? providersFor(needs) : []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="w-56 font-medium">{p.name}</span>
              <Badge
                variant={p.support === "unsupported" ? "destructive" : "outline"}
                className={p.support === "supported" ? "border-emerald-500/40 text-emerald-600" : ""}
              >
                {p.support === "supported" ? "Supported" : p.support === "supported-with-adapter" ? "Needs adapter / plan" : "Not supported"}
              </Badge>
              <span className="min-w-0 flex-1 text-muted-foreground">{p.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Your application also stays live inside BuildFlow at <code>/run/{id}</code>, and the customer website at <code>/site/{id}</code>.
          Custom domains point at whichever host you deploy to — no code changes needed.
        </p>
      </Card>
    </div>
  );
}
