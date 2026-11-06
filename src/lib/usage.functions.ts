import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, type PlanId } from "./plans";

export interface UsageState {
  plan: PlanId;
  generationsUsed: number;
  generationsLimit: number; // -1 unlimited
  projectsUsed: number;
  projectsLimit: number;
  canGenerate: boolean;
  canCreateProject: boolean;
}

export const getUsageState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageState> => {
    const { supabase, userId } = context;
    const month = new Date();
    month.setUTCDate(1);
    month.setUTCHours(0, 0, 0, 0);
    const periodMonth = month.toISOString().slice(0, 10);

    const [{ data: sub }, { data: counter }, { count: projectsCount }] = await Promise.all([
      supabase.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle(),
      supabase.from("usage_counters").select("generations").eq("user_id", userId).eq("period_month", periodMonth).maybeSingle(),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const plan = (sub?.plan as PlanId) ?? "free";
    const def = PLANS[plan] ?? PLANS.free;
    const gUsed = counter?.generations ?? 0;
    const pUsed = projectsCount ?? 0;
    return {
      plan,
      generationsUsed: gUsed,
      generationsLimit: def.generations,
      projectsUsed: pUsed,
      projectsLimit: def.projects,
      canGenerate: def.generations < 0 || gUsed < def.generations,
      canCreateProject: def.projects < 0 || pUsed < def.projects,
    };
  });
