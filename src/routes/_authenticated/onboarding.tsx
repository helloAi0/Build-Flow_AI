import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Users, Target, AlertCircle, ArrowRight, Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — BuildFlow AI" }] }),
  component: Onboarding,
});

type Answers = {
  business_type: string;
  business_size: string;
  primary_goal: string;
  main_challenge: string;
};

const STEPS: {
  key: keyof Answers;
  title: string;
  subtitle: string;
  icon: typeof Briefcase;
  options: { value: string; label: string; desc?: string }[];
}[] = [
  {
    key: "business_type",
    title: "What kind of business do you run?",
    subtitle: "We'll tailor your AI recommendations.",
    icon: Briefcase,
    options: [
      { value: "retail", label: "Retail / E-commerce", desc: "Shops, products, inventory" },
      { value: "services", label: "Services", desc: "Agencies, consulting, freelance" },
      { value: "hospitality", label: "Hospitality", desc: "Restaurants, salons, hotels" },
      { value: "saas", label: "SaaS / Tech", desc: "Software & digital products" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    key: "business_size",
    title: "How big is your team?",
    subtitle: "Right-sizes the recommended tools.",
    icon: Users,
    options: [
      { value: "solo", label: "Just me" },
      { value: "small", label: "2-10 people" },
      { value: "medium", label: "11-50 people" },
      { value: "large", label: "50+ people" },
    ],
  },
  {
    key: "primary_goal",
    title: "What's your primary goal right now?",
    subtitle: "We'll prioritize the right blueprint.",
    icon: Target,
    options: [
      { value: "grow_sales", label: "Grow sales & revenue" },
      { value: "save_time", label: "Save time & automate" },
      { value: "better_ux", label: "Improve customer experience" },
      { value: "launch", label: "Launch something new" },
    ],
  },
  {
    key: "main_challenge",
    title: "What's your biggest challenge?",
    subtitle: "Last one — then we'll get to work.",
    icon: AlertCircle,
    options: [
      { value: "no_website", label: "No website or weak online presence" },
      { value: "manual_work", label: "Too much manual / repetitive work" },
      { value: "tracking_customers", label: "Hard to keep track of customers" },
      { value: "inventory_ops", label: "Inventory or operations are messy" },
      { value: "marketing", label: "Marketing & getting found" },
    ],
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ business_type: "", business_size: "", primary_goal: "", main_challenge: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("onboarded_at").eq("id", u.user.id).maybeSingle();
      if (p?.onboarded_at) navigate({ to: "/dashboard", replace: true });
    })();
  }, [navigate]);

  const s = STEPS[step];
  const Icon = s.icon;
  const selected = answers[s.key];
  const isLast = step === STEPS.length - 1;

  const pick = (value: string) => setAnswers((prev) => ({ ...prev, [s.key]: value }));

  const next = async () => {
    if (!selected) return;
    if (!isLast) return setStep(step + 1);
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({
      ...answers,
      onboarded_at: new Date().toISOString(),
    }).eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("You're all set. Let's build something.");
    navigate({ to: "/generate", replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-brand-gradient" : "bg-muted"}`}
          />
        ))}
      </div>

      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient shadow-glow">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            <h1 className="font-display text-xl sm:text-2xl">{s.title}</h1>
          </div>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{s.subtitle}</p>

        <div className="grid gap-2">
          {s.options.map((o) => {
            const active = selected === o.value;
            return (
              <button
                key={o.value}
                onClick={() => pick(o.value)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-accent"}`}
              >
                <div>
                  <p className="font-medium">{o.label}</p>
                  {o.desc && <p className="text-xs text-muted-foreground">{o.desc}</p>}
                </div>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            onClick={next}
            disabled={!selected || saving}
            className="bg-brand-gradient text-white hover:opacity-95"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLast ? "Finish" : "Continue"}
            {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
