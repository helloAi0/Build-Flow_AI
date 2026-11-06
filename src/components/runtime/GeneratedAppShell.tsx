import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, Search, Menu, X, LogOut, ChevronRight, Wrench, Settings as SettingsIcon,
  ExternalLink, Layers, AlertTriangle, User, Globe, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { AppDefinition, AppMetrics } from "@/lib/appRuntime";

type Props = {
  app: AppDefinition;
  metrics: AppMetrics;
  children: React.ReactNode;
};

/**
 * Shell for a GENERATED application. Intentionally contains no BuildFlow
 * builder concepts — it is branded and navigated as the user's own app.
 */
export function GeneratedAppShell({ app, metrics, children }: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const currentSlug = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // run, :id, [slug]
    return parts[2] ?? "dashboard";
  }, [pathname]);

  const current = app.nav.find((n) => n.slug === currentSlug) ?? app.dashboard ?? app.nav[0] ?? null;

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return app.nav.filter((n) => n.title.toLowerCase().includes(s) || n.kind.includes(s)).slice(0, 6);
  }, [q, app.nav]);

  const alerts = useMemo(() => {
    const list: Array<{ title: string; detail: string }> = [];
    for (const l of metrics.lowStock) {
      list.push({ title: `Low stock: ${l.label}`, detail: `${l.stock} left (threshold ${l.threshold})` });
    }
    if (metrics.overdue > 0) list.push({ title: "Overdue invoices", detail: `${Math.round(metrics.overdue).toLocaleString()} outstanding past due` });
    return list;
  }, [metrics]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const NavList = () => (
    <nav className="space-y-1" aria-label={`${app.name} navigation`}>
      {app.nav.map((n) => {
        const Icon = n.def.icon ?? Layers;
        const isActive = n.slug === currentSlug;
        const to = n.type === "dashboard" ? "/run/$id" : "/run/$id/$slug";
        return (
          <Link
            key={n.slug}
            to={to}
            params={n.type === "dashboard" ? { id: app.projectId } : { id: app.projectId, slug: n.slug }}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
              isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{n.title}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <Link to="/run/$id" params={{ id: app.projectId }} className="flex min-w-0 items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-sm font-semibold text-white shadow-glow">
        {app.initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{app.name}</p>
        {app.tagline ? <p className="truncate text-[11px] text-muted-foreground">{app.tagline}</p> : null}
      </div>
    </Link>
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card p-3 lg:flex">
        <div className="px-1 py-2"><Brand /></div>
        <div className="mt-3 flex-1 overflow-y-auto"><NavList /></div>
        <div className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          <p className="px-3">Data stored securely. Only you can see it.</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card p-3">
            <div className="flex items-center justify-between px-1 py-2">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-3 flex-1 overflow-y-auto"><NavList /></div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur sm:px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages..."
              className="h-9 pl-8"
              aria-label="Search application pages"
            />
            {results.length > 0 ? (
              <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                {results.map((r) => (
                  <button
                    key={r.slug}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setQ("");
                      if (r.type === "dashboard") navigate({ to: "/run/$id", params: { id: app.projectId } });
                      else navigate({ to: "/run/$id/$slug", params: { id: app.projectId, slug: r.slug } });
                    }}
                  >
                    <r.def.icon className="h-4 w-4 text-primary" /> {r.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {alerts.length > 0 ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b border-border px-3 py-2 text-sm font-medium">Notifications</div>
                {alerts.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">Nothing needs your attention.</p>
                ) : (
                  <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                    {alerts.map((a, i) => (
                      <li key={i} className="flex gap-2 px-3 py-2 text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div><p>{a.title}</p><p className="text-xs text-muted-foreground">{a.detail}</p></div>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-medium">
                    {(email || "U").slice(0, 1).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  <User className="mr-1.5 inline h-3.5 w-3.5" />{email || "Signed in"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/run/$id/$slug", params: { id: app.projectId, slug: settingsSlug(app) } })}>
                  <SettingsIcon className="mr-2 h-4 w-4" /> Application settings
                </DropdownMenuItem>
                {app.isPublic ? (
                  <DropdownMenuItem asChild>
                    <a href={`/site/${app.projectId}`} target="_blank" rel="noreferrer">
                      <Globe className="mr-2 h-4 w-4" /> View customer website
                    </a>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => navigate({ to: "/maintain/$id", params: { id: app.projectId } })}>
                  <Wrench className="mr-2 h-4 w-4" /> Change &amp; maintain
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/export/$id", params: { id: app.projectId } })}>
                  <Download className="mr-2 h-4 w-4" /> Export &amp; deploy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app/$id", params: { id: app.projectId }, search: {} })}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Edit in BuildFlow
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 px-4 pt-4 text-xs text-muted-foreground sm:px-6">
          <Link to="/run/$id" params={{ id: app.projectId }} className="hover:text-foreground">{app.name}</Link>
          {current && current.type !== "dashboard" ? (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{current.title}</span>
            </>
          ) : null}
          {app.status !== "ready" ? (
            <Badge variant="outline" className="ml-2 text-[10px] capitalize">{app.status}</Badge>
          ) : null}
        </div>

        <main className="px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

export function settingsSlug(app: AppDefinition): string {
  return app.nav.find((n) => n.type === "settings")?.slug ?? "settings";
}
