import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Sparkles, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Solution History — BuildFlow AI" }] }),
  component: HistoryPage,
});

type Sol = { id: string; prompt: string; created_at: string; solutions: unknown };

function HistoryPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_solutions")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Sol[];
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Solution history</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Every AI generation you've run, in one place.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map(i => <Card key={i} className="h-24 animate-pulse bg-muted" />)}</div>
      ) : data.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg">No history yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Run your first AI generation to see it here.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {data.map((s) => {
            const count = Array.isArray(s.solutions) ? s.solutions.length : 0;
            return (
              <Card key={s.id} className="p-4">
                <p className="line-clamp-2 text-sm font-medium">{s.prompt}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(s.created_at))} ago</span>
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {count} solution{count === 1 ? "" : "s"}</span>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
