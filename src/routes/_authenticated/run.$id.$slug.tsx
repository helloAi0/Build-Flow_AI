import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { RecordsPage } from "@/components/runtime/RecordsPage";
import { RuntimeDashboard } from "@/components/runtime/RuntimeDashboard";
import { RuntimeReports } from "@/components/runtime/RuntimeReports";
import { RuntimeSettings } from "@/components/runtime/RuntimeSettings";
import { DataLoadError } from "@/components/runtime/DataLoadError";
import { useAppData } from "@/components/runtime/useApp";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/run/$id/$slug")({
  component: RuntimePage,
});

function RuntimePage() {
  const { id, slug } = useParams({ from: "/_authenticated/run/$id/$slug" });
  const { app, metrics, records, isLoading, recordsLoading, recordsError, isRefetching, retryRecords, refetch } = useAppData(id);

  if (isLoading || (recordsLoading && !recordsError)) return <Skeleton className="h-64 w-full" />;

  if (!app) return <DataLoadError what="this application" onRetry={refetch} busy={isRefetching} />;

  const page = app.nav.find((n) => n.slug === slug);
  if (!page) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <h1 className="font-display text-lg">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This application has no page at “{slug}”.</p>
        <Button asChild className="mt-4"><Link to="/run/$id" params={{ id }}>Go to dashboard</Link></Button>
      </Card>
    );
  }

  // Settings reads its own data, so it stays usable even if records failed.
  if (page.type === "settings") return <RuntimeSettings app={app} title={page.title} onSaved={refetch} />;

  if (recordsError) {
    return (
      <DataLoadError
        what={page.title.toLowerCase()}
        message={recordsError.message}
        onRetry={retryRecords}
        busy={isRefetching}
      />
    );
  }

  if (page.type === "dashboard") return <RuntimeDashboard app={app} metrics={metrics} records={records} />;
  if (page.type === "reports") return <RuntimeReports app={app} metrics={metrics} records={records} title={page.title} />;

  return (
    <RecordsPage
      projectId={id}
      page={page}
      records={records.filter((r) => r.kind === page.kind)}
      currency={app.settings.currency}
      onChanged={refetch}
    />
  );
}
