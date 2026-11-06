import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, type AppDefinition, type AppMetrics } from "@/lib/appRuntime";
import type { RuntimeRecord } from "./useApp";

export function RuntimeReports({ app, metrics, records, title }: { app: AppDefinition; metrics: AppMetrics; records: RuntimeRecord[]; title: string }) {
  const cur = app.settings.currency;
  const money = (n: number) => formatMoney(n, cur);

  const byPage = useMemo(
    () =>
      app.nav
        .filter((n) => n.type === "records")
        .map((n) => ({ title: n.title, count: records.filter((r) => r.kind === n.kind).length }))
        .sort((a, b) => b.count - a.count),
    [app.nav, records],
  );

  // Only metrics this application actually produces are listed — a portfolio or
  // booking app should not be shown a fabricated "Total revenue" line.
  const hasMoney = metrics.revenue > 0 || metrics.expenses > 0 || metrics.outstanding > 0;
  const rows: Array<{ label: string; value: string }> = [
    ...(hasMoney
      ? [
          { label: "Total revenue", value: money(metrics.revenue) },
          { label: "Total expenses", value: money(metrics.expenses) },
          { label: "Net profit", value: money(metrics.profit) },
          { label: "Outstanding payments", value: money(metrics.outstanding) },
          { label: "Overdue", value: money(metrics.overdue) },
        ]
      : []),
    ...(metrics.inventoryValue > 0 ? [{ label: "Inventory value", value: money(metrics.inventoryValue) }] : []),
    ...(metrics.lowStock.length > 0 ? [{ label: "Low-stock items", value: String(metrics.lowStock.length) }] : []),
    { label: "Total records", value: metrics.total.toLocaleString() },
  ];

  const exportCsv = () => {
    const csv = ["Metric,Value", ...rows.map((r) => `"${r.label}","${r.value}"`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app.name.replace(/\s+/g, "-").toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Calculated from every record in your application.</p>
        </div>
        <button onClick={exportCsv} className="h-9 shrink-0 rounded-md border border-border px-3 text-sm hover:bg-accent">Download CSV</button>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}><TableCell>{r.label}</TableCell><TableCell className="font-medium">{r.value}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {metrics.topItems.length > 0 ? (
        <Card className="p-5">
          <h2 className="font-display text-base">Top by value</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {metrics.topItems.map((t, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span className="truncate">{t.label}</span><span className="text-muted-foreground">{money(t.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="font-display text-base">Records per section</h2>
        {byPage.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {byPage.map((b) => {
              const max = byPage[0].count || 1;
              return (
                <div key={b.title}>
                  <div className="flex items-center justify-between text-sm"><span>{b.title}</span><span className="text-muted-foreground">{b.count}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-brand-gradient" style={{ width: `${Math.round((b.count / max) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
