import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, type PlanId } from "./plans";

const SolutionSchema = z.object({
  summary: z.string().describe("One-paragraph plain-language summary of the proposed solution, written for the user."),
  solutions: z.array(z.object({
    category: z.string().describe("One of: Website, CRM, Inventory, Automation, Analytics, Booking, Support"),
    title: z.string(),
    description: z.string(),
    features: z.array(z.string()).min(3).max(8),
    estimatedTime: z.string(),
  })).min(2).max(4),
  nextSteps: z.array(z.string()).min(3).max(6).describe("Concrete next actions the user should take"),
});

export type AiSolution = z.infer<typeof SolutionSchema>;

const Input = z.object({ prompt: z.string().min(3).max(2000) });

const LABELS: Record<string, string> = {
  retail: "retail / e-commerce", services: "services business", hospitality: "hospitality business",
  saas: "SaaS / tech company", other: "small business", solo: "solo founder",
  small: "small team (2-10)", medium: "growing team (11-50)", large: "established team (50+)",
  grow_sales: "grow sales and revenue", save_time: "save time and automate",
  better_ux: "improve customer experience", launch: "launch something new",
  no_website: "weak online presence", manual_work: "too much manual work",
  tracking_customers: "hard to track customers", inventory_ops: "messy inventory / operations",
  marketing: "marketing and discoverability",
};
const label = (v: string | null | undefined) => (v ? LABELS[v] ?? v : null);

export const generateBusinessSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<AiSolution> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Enforce plan limit
    const month = new Date();
    month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
    const periodMonth = month.toISOString().slice(0, 10);
    const [{ data: sub }, { data: counter }] = await Promise.all([
      context.supabase.from("subscriptions").select("plan").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("usage_counters").select("generations").eq("user_id", context.userId).eq("period_month", periodMonth).maybeSingle(),
    ]);
    const plan = (sub?.plan as PlanId) ?? "free";
    const def = PLANS[plan] ?? PLANS.free;
    const used = counter?.generations ?? 0;
    if (def.generations >= 0 && used >= def.generations) {
      throw new Error(`PLAN_LIMIT: You've used all ${def.generations} generations on the ${def.name} plan this month. Upgrade for more.`);
    }

    const { data: profile } = await context.supabase
      .from("profiles").select("business_type, business_size, primary_goal, main_challenge")
      .eq("id", context.userId).maybeSingle();

    const ctxLines: string[] = [];
    if (profile?.business_type) ctxLines.push(`Business type: ${label(profile.business_type)}`);
    if (profile?.business_size) ctxLines.push(`Team size: ${label(profile.business_size)}`);
    if (profile?.primary_goal) ctxLines.push(`Primary goal: ${label(profile.primary_goal)}`);
    if (profile?.main_challenge) ctxLines.push(`Main challenge: ${label(profile.main_challenge)}`);
    const userContext = ctxLines.length ? `\n\nUser context:\n${ctxLines.join("\n")}` : "";

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const system = `You are BuildFlow AI, a senior product strategist. A user describes their business problem; you respond with a concrete, actionable software solution blueprint tailored to their situation. Be specific, practical, and focused on real small businesses. Avoid generic fluff.${userContext}`;

    const { experimental_output } = await generateText({
      model, system, prompt: data.prompt,
      experimental_output: Output.object({ schema: SolutionSchema }),
    });

    // Increment usage atomically
    await context.supabase.rpc("increment_generation_usage", { _user_id: context.userId });

    return experimental_output;
  });
