import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLAN_LIST, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BuildFlow AI" },
      { name: "description", content: "Simple, transparent pricing for BuildFlow AI. Free to start, paid plans for growing teams." },
      { property: "og:title", content: "BuildFlow AI Pricing" },
      { property: "og:description", content: "Free, Starter $9, and Pro $29 plans for building business software with AI." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [pending, setPending] = useState<PlanId | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: sub } = await supabase.from("subscriptions").select("plan").maybeSingle();
      if (sub) setCurrentPlan(sub.plan);
    })();
  }, []);

  const choose = async (plan: PlanId) => {
    if (!userId) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    if (currentPlan === plan) return;
    setPending(plan);
    const { error } = await supabase
      .from("subscriptions")
      .update({ plan, status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    setPending(null);
    if (error) return toast.error(error.message);
    setCurrentPlan(plan);
    toast.success(plan === "free" ? "Downgraded to Free." : `You're on ${plan.charAt(0).toUpperCase() + plan.slice(1)}. Welcome aboard.`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-dvh bg-hero text-white">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Pricing</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Simple plans that scale with you.</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Start free. Upgrade when you're ready. Cancel anytime.</p>
          {userId && (
            <p className="mt-4 text-xs text-white/60">
              Current plan: <span className="font-medium text-white">{currentPlan.toUpperCase()}</span>
            </p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_LIST.map((p) => {
            const isCurrent = userId && currentPlan === p.id;
            const cta = !userId
              ? p.id === "free" ? "Start free" : `Start ${p.name}`
              : isCurrent ? "Current plan"
              : p.id === "free" ? "Switch to Free" : `Upgrade to ${p.name}`;
            return (
              <Card key={p.id} className={`relative p-8 ${p.featured ? "border-transparent bg-brand-gradient text-white shadow-glow" : "border-white/10 bg-white/[0.04] text-white"}`}>
                {p.featured && <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2 py-0.5 text-xs">Popular</span>}
                <h3 className="font-display text-xl">{p.name}</h3>
                <p className="mt-1 text-sm opacity-80">{p.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl">{p.priceLabel}</span>
                  <span className="text-sm opacity-70">/mo</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {f}</li>)}
                </ul>
                <Button onClick={() => choose(p.id)} disabled={Boolean(isCurrent) || pending !== null}
                  className={`mt-8 w-full ${p.featured ? "bg-white text-navy hover:bg-white/90" : "bg-white/10 text-white hover:bg-white/20"} disabled:opacity-70`}>
                  {pending === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {cta}
                </Button>
              </Card>
            );
          })}
        </div>
        {userId && (
          <p className="mt-10 text-center text-xs text-white/50">
            Public beta: plan changes apply instantly. Real card billing arrives shortly.{" "}
            <Link to="/settings" className="underline">Manage account</Link>
          </p>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
