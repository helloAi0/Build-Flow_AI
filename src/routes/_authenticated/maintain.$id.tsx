import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity, ArrowLeft, CheckCircle2, History, Loader2, RotateCcw, Sparkles, XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AssistantSheet } from "@/components/workspace/AssistantSheet";
import { getAppHealth, listAppVersions, listAppEvents, rollbackAppVersion } from "@/lib/maintenance.functions";

export const Route = createFileRoute("/_authenticated/maintain/$id")({
  head: () => ({
    meta: [
      { title: "Maintain your application — BuildFlow AI" },
      {
        name: "description",
        content:
          "Change, test, troubleshoot and roll back your generated business application with the BuildFlow AI assistant.",
      },
      { property: "og:title", content: "Maintain your application — BuildFlow AI" },
      { property: "og:description", content: "AI-assisted changes, health checks, version history and rollback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintainPage,
});

function MaintainPage() {
  const { id } = useParams({ from: "/_authenticated/maintain/$id" });
  const qc = useQueryClient();
  const [assistant, setAssistant] = useState(false);
  const [rollbackTo, setRollbackTo] = useState<number | null>(null);

  const health = useServerFn(getAppHealth);
  const versionsFn = useServerFn(listAppVersions);
  const eventsFn = useServerFn(listAppEvents);
  const rollbackFn = useServerFn(rollbackAppVersion);

  const versions = useQuery({ queryKey: ["app-versions", id], queryFn: () => versionsFn({ data: { projectId: id } }) });
  const events = useQuery({ queryKey: ["app-events", id], queryFn: () => eventsFn({ data: { projectId: id } }) });

  const check = useMutation({
    mutationFn: () => health({ data: { projectId: id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["app-events", id] });
      qc.invalidateQueries({ queryKey: ["workspace", id] });
      if (res.status === "ready") toast.success("Everything is working");
      else toast.error(`${res.checks.filter((c) => !c.ok).length} check(s) failed`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rollback = useMutation({
    mutationFn: (version: number) => rollbackFn({ data: { projectId: id, version } }),
    onSuccess: (res) => {
      setRollbackTo(null);
      qc.invalidateQueries({ queryKey: ["app-versions", id] });
      qc.invalidateQueries({ queryKey: ["app-events", id] });
      qc.invalidateQueries({ queryKey: ["workspace", id] });
      qc.invalidateQueries({ queryKey: ["app-records", id] });
      if (res.ok) toast.success(`Restored version ${res.version}`);
      else toast.warning(`Restored version ${res.version}, but some checks failed`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checks = check.data?.checks ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to="/run/$id" params={{ id }}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to my application
            </Link>
          </Button>
          <h1 className="font-display text-2xl">Maintain your application</h1>
          <p className="text-sm text-muted-foreground">
            Ask for changes in plain words, check everything still works, and undo anything.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => check.mutate()} disabled={check.isPending}>
            {check.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Activity className="mr-1.5 h-4 w-4" />}
            {check.isPending ? "Testing..." : "Test everything"}
          </Button>
          <Button className="bg-brand-gradient text-white" onClick={() => setAssistant(true)}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Ask for a change
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg">Health</h2>
        {checks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Run a test to check every page, form, and the database of your application. Nothing is left behind — test data
            is removed automatically.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {checks.map((c) => (
              <li key={c.name} className="flex items-start gap-2">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <span className={c.ok ? "" : "text-destructive"}>
                  {c.name}
                  {c.detail ? <span className="text-muted-foreground"> — {c.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <History className="h-4 w-4 text-primary" /> Version history
          </h2>
          {versions.isLoading ? (
            <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (versions.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No saved versions yet. Every change made by the assistant saves one automatically.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {(versions.data ?? []).map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      Version {v.version} — {v.label}
                    </p>
                    {v.summary ? <p className="truncate text-xs text-muted-foreground">{v.summary}</p> : null}
                    <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRollbackTo(v.version)}
                    disabled={rollback.isPending}
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <Activity className="h-4 w-4 text-primary" /> Activity
          </h2>
          {events.isLoading ? (
            <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (events.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Changes, tests and restores will appear here.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{e.message}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </span>
                  <Badge variant={e.level === "error" ? "destructive" : e.level === "warning" ? "outline" : "secondary"}>
                    {e.level}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AssistantSheet open={assistant} onOpenChange={setAssistant} projectId={id} />

      <AlertDialog open={rollbackTo !== null} onOpenChange={(o) => !o && setRollbackTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {rollbackTo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your application's pages, fields and settings go back to that version. Your current setup is saved first, so
              you can come back. Pages that did not exist in that version are removed along with the information they hold.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => rollbackTo !== null && rollback.mutate(rollbackTo)}>
              {rollback.isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
