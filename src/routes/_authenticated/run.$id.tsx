import { createFileRoute, Outlet, useParams, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GeneratedAppShell } from "@/components/runtime/GeneratedAppShell";
import { useAppData } from "@/components/runtime/useApp";
import { validateApplication } from "@/lib/runtime.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/run/$id")({
  head: () => ({
    meta: [
      { title: "Live application — BuildFlow AI" },
      { name: "description", content: "Your generated business application, running live with real data and full CRUD." },
      { property: "og:title", content: "Live application — BuildFlow AI" },
      { property: "og:description", content: "Your generated business application, running live with real data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RuntimeLayout,
});

function RuntimeLayout() {
  const { id } = useParams({ from: "/_authenticated/run/$id" });
  const { app, metrics, isLoading, isError, error, refetch } = useAppData(id);
  const validate = useServerFn(validateApplication);

  const check = useMutation({
    mutationFn: () => validate({ data: { projectId: id } }),
    onSuccess: (res) => {
      refetch();
      const failed = res.checks.filter((c) => !c.ok);
      if (res.status === "ready") toast.success("All application checks passed");
      else toast.error(`${failed.length} check(s) failed: ${failed.map((c) => c.name).join(", ")}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-52" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <Card className="max-w-md p-6 text-center">
          <h1 className="font-display text-lg">Application unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error?.message ?? "We couldn't load this application."}</p>
          <Button asChild className="mt-4"><Link to="/projects">Back to my apps</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <GeneratedAppShell app={app} metrics={metrics}>
      {app.status !== "ready" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span>This application hasn't been verified yet. Run a live check of every page and its database.</span>
          <Button size="sm" onClick={() => check.mutate()} disabled={check.isPending}>
            {check.isPending ? "Checking..." : "Run checks"}
          </Button>
        </div>
      ) : null}
      <Outlet />
    </GeneratedAppShell>
  );
}
