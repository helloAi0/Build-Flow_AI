import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminMetrics {
  totalUsers: number;
  activeUsers7d: number;
  totalGenerations: number;
  generations7d: number;
  totalProjects: number;
  paidSubscribers: number;
  starterCount: number;
  proCount: number;
  mrr: number;
  conversionRate: number;
  waitlistCount: number;
  feedbackOpen: number;
  recentSignups: Array<{ id: string; email: string | null; full_name: string | null; created_at: string }>;
  recentFeedback: Array<{ id: string; type: string; message: string; email: string | null; created_at: string }>;
}

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMetrics> => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleErr || !isAdmin) throw new Error("Forbidden");

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [
      users, profiles7d, gensTotal, gens7d, projTotal,
      subs, waitlist, feedback, recentUsers, recentFb,
    ] = await Promise.all([
      context.supabase.from("profiles").select("*", { count: "exact", head: true }),
      context.supabase.from("generated_solutions").select("user_id", { count: "exact" }).gte("created_at", weekAgo),
      context.supabase.from("generated_solutions").select("*", { count: "exact", head: true }),
      context.supabase.from("generated_solutions").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      context.supabase.from("projects").select("*", { count: "exact", head: true }),
      context.supabase.from("subscriptions").select("plan"),
      context.supabase.from("waitlist").select("*", { count: "exact", head: true }),
      context.supabase.from("feedback").select("*", { count: "exact", head: true }).eq("status", "open"),
      context.supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(8),
      context.supabase.from("feedback").select("id, type, message, email, created_at").order("created_at", { ascending: false }).limit(8),
    ]);

    const subRows = subs.data ?? [];
    const starter = subRows.filter((s) => s.plan === "starter").length;
    const pro = subRows.filter((s) => s.plan === "pro").length;
    const paid = starter + pro;
    const totalUsers = users.count ?? 0;
    const activeIds = new Set((profiles7d.data ?? []).map((r) => r.user_id));

    return {
      totalUsers,
      activeUsers7d: activeIds.size,
      totalGenerations: gensTotal.count ?? 0,
      generations7d: gens7d.count ?? 0,
      totalProjects: projTotal.count ?? 0,
      paidSubscribers: paid,
      starterCount: starter,
      proCount: pro,
      mrr: starter * 9 + pro * 29,
      conversionRate: totalUsers > 0 ? (paid / totalUsers) * 100 : 0,
      waitlistCount: waitlist.count ?? 0,
      feedbackOpen: feedback.count ?? 0,
      recentSignups: recentUsers.data ?? [],
      recentFeedback: recentFb.data ?? [],
    };
  });
