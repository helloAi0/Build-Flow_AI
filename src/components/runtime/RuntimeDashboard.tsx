import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { formatMoney, type AppDefinition, type AppMetrics } from "@/lib/appRuntime";
import type { RuntimeRecord } from "./useApp";

export function RuntimeDashboard({ app, metrics, records }: { app: AppDefinition; metrics: AppMetrics; records: RuntimeRecord[] }) {
  const cur = app.settings.currency;
  const money = (n: number) => formatMoney(n, cur);
  const pages = app.nav.filter((n) => n.type === "records");

  const kpis: Array<{ label: string; value: string }> = [
    { label: "Revenue", value: money(metrics.revenue) },
    { label: "Expenses", value: money(metrics.expenses) },
    { label: "Profit", value: money(metrics.profit) },
    { label: "Outstanding", value: money(metrics.outstanding) },
  ];
  if (metrics.inventoryValue > 0) kpis.push({ label: "Inventory value", value: money(metrics.inventoryValue) });
  kpis.push({ label: "Records", value: metrics.total.toLocaleString() });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl sm:text-2xl">{app.dashboard?.title ?? "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">Live numbers from your own data.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-2xl">{k.value}</p>
          </Card>
        ))}
      </div>

      {metrics.lowStock.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="font-display text-base">Needs attention — low stock</h2>
          </div>
          <ul className="mt-3 divide-y divide-border text-sm">
            {metrics.lowStock.map((l, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span className="truncate">{l.label}</span>
                <span className="text-muted-foreground">{l.stock} left</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => {
            const Icon = p.def.icon;
            const count = records.filter((r) => r.kind === p.kind).length;
            return (
              <Link
                key={p.slug}
                to="/run/$id/$slug"
                params={{ id: app.projectId, slug: p.slug }}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:shadow-card"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-gradient"><Icon className="h-5 w-5 text-white" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{p.title}</p>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {count === 0 ? <span className="inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add your first</span> : `${count} record${count === 1 ? "" : "s"}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-base">Recent activity</h2>
        {metrics.recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing yet — create a record from any page above.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {metrics.recent.map((r, i) => {
              const nav = app.nav.find((n) => n.kind === r.kind);
              const Icon = nav?.def.icon;
              return (
                <li key={i} className="flex items-center gap-3 py-2 text-sm">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-muted">
                    {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{nav?.title ?? r.kind} · {new Date(r.when).toLocaleString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
