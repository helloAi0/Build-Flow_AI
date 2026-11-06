export type PlanId = "free" | "starter" | "pro";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number; // monthly USD
  priceLabel: string;
  description: string;
  generations: number; // -1 = unlimited
  projects: number; // -1 = unlimited
  features: string[];
  featured?: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    description: "Try BuildFlow AI.",
    generations: 3,
    projects: 1,
    features: ["3 AI generations / mo", "1 active project", "Community support"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 9,
    priceLabel: "$9",
    description: "For founders & freelancers.",
    generations: 50,
    projects: 10,
    features: ["50 AI generations / mo", "10 projects", "Email support", "Save & export"],
    featured: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    priceLabel: "$29",
    description: "For growing teams.",
    generations: -1,
    projects: -1,
    features: ["Unlimited generations", "Unlimited projects", "Priority support", "API access", "Advanced blueprints"],
  },
};

export const PLAN_LIST: PlanDef[] = [PLANS.free, PLANS.starter, PLANS.pro];

export const isUnlimited = (n: number) => n < 0;
export const formatLimit = (n: number) => (isUnlimited(n) ? "Unlimited" : String(n));
