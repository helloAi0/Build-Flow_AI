import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wand2, FolderKanban, Sparkles, BarChart3, ArrowRight, LayoutTemplate } from "lucide-react";
import { formatDistanceToNow, subDays, format, startOfDay } from "date-fns";
import { getUsageState } from "@/lib/usage.functions";
import { PLANS, isUnlimited, formatLimit } from "@/lib/plans";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TEMPLATES } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BuildFlow AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: solutions = [] } = useQuery({
    queryKey: ["solutions"],
    queryFn: async () => {
      const { data } = await supabase.from("generated_solutions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: sub } = useQuery({
    queryKey: ["sub"],
    queryFn: async () => (await supabase.from("subscriptions").select("*").maybeSingle()).data,
  });
  const fetchUsage = useServerFn(getUsageState);
  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });

  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? user?.email?.split("@")[0] ?? "there";
  const planId = (sub?.plan ?? "free") as keyof typeof PLANS;
  const planDef = PLANS[planId] ?? PLANS.free;

  // 14-day generation trend
  const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
  const chart = days.map((d) => {
    const next = new Date(d.getTime() + 86400000);
    const count = solutions.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    return { date: format(d, "MMM d"), Generations: count };
  });

  const stats = [
    { label: "Projects", value: projects.length, icon: FolderKanban },
    { label: "Generations", value: solutions.length, icon: Sparkles },
    { label: "Plan", value: planDef.name, icon: BarChart3 },
  ];

  const recentTemplates = TEMPLATES.slice(0, 4);

  const gUsed = usage?.generationsUsed ?? 0;
  const gLimit = usage?.generationsLimit ?? planDef.generations;
  const pUsed = usage?.projectsUsed ?? projects.length;
  const pLimit = usage?.projectsLimit ?? planDef.projects;
  const gPct = isUnlimited(gLimit) ? 0 : Math.min(100, (gUsed / Math.max(gLimit, 1)) * 100);
  const pPct = isUnlimited(pLimit) ? 0 : Math.min(100, (pUsed / Math.max(pLimit, 1)) * 100);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl sm:text-3xl">Welcome back, {name}.</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Pick up where you left off, or generate something new.</p>
        </div>
        <Link to="/generate" className="shrink-0">
          <Button className="bg-brand-gradient text-white hover:opacity-95"><Wand2 className="mr-2 h-4 w-4" /> New</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-3xl">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg">This month's usage</h3>
            <p className="text-xs text-muted-foreground">Resets the 1st of every month</p>
          </div>
          <Link to="/pricing"><Button size="sm" variant="outline">Manage plan</Button></Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI generations</span>
              <span className="font-medium">{gUsed} / {formatLimit(gLimit)}</span>
            </div>
            <Progress value={isUnlimited(gLimit) ? 100 : gPct} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active projects</span>
              <span className="font-medium">{pUsed} / {formatLimit(pLimit)}</span>
            </div>
            <Progress value={isUnlimited(pLimit) ? 100 : pPct} />
          </div>
        </div>
      </Card>


      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg">Activity</h3>
            <p className="text-xs text-muted-foreground">Generations over the last 14 days</p>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="Generations" stroke="hsl(var(--primary))" fill="url(#g)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden border-0 bg-brand-gradient p-8 text-white shadow-glow">
        <h2 className="font-display text-2xl">Ask BuildFlow AI</h2>
        <p className="mt-1 text-white/80">Describe a business problem and get a tailored software solution.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/generate"><Button className="bg-white text-navy hover:bg-white/90">Open AI Generator <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          <Link to="/templates"><Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20"><LayoutTemplate className="mr-2 h-4 w-4" /> Browse templates</Button></Link>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg">Recent projects</h3>
            <Link to="/projects" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet. Start by generating a solution.</p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at))} ago</p>
                  </div>
                  <Link to="/run/$id" params={{ id: p.id }} className="text-sm text-primary hover:underline">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg">Quick templates</h3>
            <Link to="/templates" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recentTemplates.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  to="/templates"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:bg-accent"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-gradient">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="truncate text-sm font-medium">{t.name}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
