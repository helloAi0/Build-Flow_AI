import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (!location.pathname.startsWith("/onboarding")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!profile?.onboarded_at) throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Onboarding renders without the app shell for a focused experience.
  if (pathname.startsWith("/onboarding")) {
    return (
      <div className="min-h-dvh bg-background px-4 py-12">
        <Outlet />
      </div>
    );
  }
  // Generated applications run in their own shell — no BuildFlow chrome.
  if (pathname.startsWith("/run/")) return <Outlet />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
