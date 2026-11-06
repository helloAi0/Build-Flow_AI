import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listWorkspace } from "@/lib/workspace.functions";
import { buildAppDefinition, computeMetrics, type AppDefinition, type AppModule } from "@/lib/appRuntime";

export type RuntimeRecord = {
  id: string;
  kind: string;
  data: Record<string, unknown>;
  created_at: string;
};

/** Loads the application definition + all application data for the runtime. */
export function useAppData(projectId: string) {
  const list = useServerFn(listWorkspace);

  const ws = useQuery({
    queryKey: ["workspace", projectId],
    queryFn: () => list({ data: { projectId } }),
  });

  const recordsQ = useQuery({
    queryKey: ["app-records", projectId],
    retry: 1,
    queryFn: async () => {
      // A failed read must surface as an error, never as "you have no data yet".
      const { data, error } = await supabase
        .from("module_records")
        .select("id, kind, data, created_at")
        .eq("project_id", projectId);
      if (error) throw new Error(error.message);
      return ((data ?? []) as RuntimeRecord[]).filter(
        (r) => !(r.data as Record<string, unknown>)?.__validation,
      );
    },
  });

  const app: AppDefinition | null = useMemo(() => {
    const project = ws.data?.project ?? null;
    if (!project) return null;
    return buildAppDefinition(project, (ws.data?.modules ?? []) as AppModule[]);
  }, [ws.data]);

  const records = recordsQ.data ?? [];
  const metrics = useMemo(() => computeMetrics(records), [records]);

  return {
    app,
    records,
    metrics,
    isLoading: ws.isLoading,
    recordsLoading: recordsQ.isPending && !recordsQ.isError,
    isError: ws.isError,
    error: ws.error as Error | null,
    /** data-load failure: pages show an inline retry instead of an empty state */
    recordsError: (recordsQ.error as Error | null) ?? null,
    isRefetching: recordsQ.isFetching,
    retryRecords: () => { void recordsQ.refetch(); },
    refetch: () => { void ws.refetch(); void recordsQ.refetch(); },
  };
}
