import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Sparkles, FolderKanban, DollarSign, TrendingUp, Mail, MessageSquare, Bug, Lightbulb, LifeBuoy } from "lucide-react";
import { getAdminMetrics } from "@/lib/admin.functions";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — BuildFlow AI" }] }),
  component: AdminDashboard,
});

const TYPE_ICON = { bug: Bug, feature: Lightbulb, support: LifeBuoy };

function AdminDashboard() {
  const navigate = useNavigate();
  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => fetchMetrics(),
    retry: false,
  });

  useEffect(() => {
    if (error && /Forbidden/.test((error as Error).message)) {
      navigate({ to: "/dashboard" });
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <h2 className="font-display text-xl">Access denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">This area is for founders only.</p>
      </Card>
    );
  }

  if (!data) return null;

  const stats = [
    { label: "Total users", value: data.totalUsers, icon: Users },
    { label: "Active (7d)", value: data.activeUsers7d, icon: TrendingUp },
    { label: "Generations", value: data.totalGenerations, sub: `+${data.generations7d} this week`, icon: Sparkles },
    { label: "Projects", value: data.totalProjects, icon: FolderKanban },
    { label: "Paid subscribers", value: data.paidSubscribers, sub: `${data.starterCount} Starter · ${data.proCount} Pro`, icon: DollarSign },
    { label: "MRR", value: `$${data.mrr}`, icon: DollarSign },
    { label: "Conversion", value: `${data.conversionRate.toFixed(1)}%`, icon: TrendingUp },
    { label: "Waitlist", value: data.waitlistCount, icon: Mail },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Founder</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time view of users, revenue, and feedback.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-2xl">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg">Recent signups</h3>
            <span className="text-xs text-muted-foreground">{data.recentSignups.length} shown</span>
          </div>
          {data.recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentSignups.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.full_name || u.email || "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at))} ago</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg">Latest feedback</h3>
            <span className="text-xs text-muted-foreground">{data.feedbackOpen} open</span>
          </div>
          {data.recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentFeedback.map((f) => {
                const Icon = TYPE_ICON[f.type as keyof typeof TYPE_ICON] ?? MessageSquare;
                return (
                  <li key={f.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">{f.type}</span>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(f.created_at))} ago</span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm">{f.message}</p>
                        {f.email && <p className="mt-1 text-xs text-muted-foreground">{f.email}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
