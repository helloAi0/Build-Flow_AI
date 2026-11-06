import { createFileRoute, useParams } from "@tanstack/react-router";
import { RuntimeDashboard } from "@/components/runtime/RuntimeDashboard";
import { DataLoadError } from "@/components/runtime/DataLoadError";
import { useAppData } from "@/components/runtime/useApp";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/run/$id/")({
  component: RuntimeHome,
});

function RuntimeHome() {
  const { id } = useParams({ from: "/_authenticated/run/$id/" });
  const { app, metrics, records, isLoading, recordsLoading, recordsError, isRefetching, retryRecords } = useAppData(id);
  if (isLoading || (recordsLoading && !recordsError)) return <Skeleton className="h-64 w-full" />;
  if (recordsError) {
    return (
      <DataLoadError
        what="your dashboard"
        message={recordsError.message}
        onRetry={retryRecords}
        busy={isRefetching}
      />
    );
  }
  if (!app) return <DataLoadError what="this application" onRetry={retryRecords} busy={isRefetching} />;
  return <RuntimeDashboard app={app} metrics={metrics} records={records} />;
}
