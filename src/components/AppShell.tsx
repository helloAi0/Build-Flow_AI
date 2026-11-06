import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sparkles, LayoutDashboard, Wand2, FolderKanban, Settings,
  CreditCard, LogOut, Menu, X, LayoutTemplate, History, ShieldCheck,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FeedbackDialog } from "@/components/FeedbackDialog";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/generate", label: "AI Generator", icon: Wand2 },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/pricing", label: "Billing", icon: CreditCard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
        setIsAdmin(Boolean(roles));
      }
    })();
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-brand-gradient"><Sparkles className="h-3.5 w-3.5 text-white" /></div>
          <span className="font-display text-sm font-semibold">BuildFlow AI</span>
        </Link>
        <Button size="icon" variant="ghost" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-foreground/30 backdrop-blur-sm md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out md:translate-x-0 ${open ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient shadow-glow"><Sparkles className="h-4 w-4 text-white" /></div>
          <span className="font-display font-semibold">BuildFlow AI</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"}`}>
                <n.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${pathname.startsWith("/admin") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"}`}>
              <ShieldCheck className="h-4 w-4 shrink-0" /> <span className="truncate">Admin</span>
            </Link>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <FeedbackDialog trigger={
            <Button variant="outline" size="sm" className="mb-2 w-full justify-start gap-2">
              <Sparkles className="h-4 w-4" /> Send feedback
            </Button>
          } />
          <div className="rounded-xl border border-sidebar-border bg-card p-3">
            <p className="truncate text-xs text-muted-foreground" title={email}>{email || "Loading…"}</p>
            <Button onClick={signOut} variant="ghost" size="sm" className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="ml-0 flex-1 pt-14 md:ml-64 md:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
