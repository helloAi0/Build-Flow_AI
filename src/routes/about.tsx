import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Users, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — BuildFlow AI" },
      { name: "description", content: "We're building the fastest way for small businesses to turn ideas into working software." },
      { property: "og:title", content: "About BuildFlow AI" },
      { property: "og:description", content: "Software for small business owners, generated from plain English." },
    ],
  }),
  component: About,
});

const VALUES = [
  { icon: Target, title: "Outcomes over features", desc: "We measure success by how many small businesses launch faster — not how many checkboxes we ship." },
  { icon: Users, title: "Built for non-technical founders", desc: "If you can describe your problem, you can build the solution." },
  { icon: Zap, title: "Speed is the product", desc: "Going from idea to working blueprint should take minutes, not months." },
];

function About() {
  return (
    <div className="min-h-dvh bg-hero text-white">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/80">
          <Sparkles className="h-3.5 w-3.5 text-[oklch(0.82_0.16_220)]" /> Our story
        </div>
        <h1 className="font-display text-4xl text-white sm:text-6xl">Software shouldn't require an engineering team.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-white/70">
          We started BuildFlow AI after watching too many great small businesses stall because they couldn't afford custom software. Today, anyone can describe a business problem in plain English and walk away with a tailored, working solution.
        </p>
      </section>

      <section className="bg-[oklch(0.18_0.05_260)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl text-white sm:text-4xl">What we believe</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {VALUES.map((v) => (
              <Card key={v.title} className="border-white/10 bg-white/[0.04] p-6 text-white">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient"><v.icon className="h-5 w-5 text-white" /></div>
                <h3 className="font-display text-lg">{v.title}</h3>
                <p className="mt-2 text-sm text-white/70">{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl text-white sm:text-4xl">Join us in public beta.</h2>
          <p className="mt-4 text-white/70">We're shipping fast and listening hard. Your feedback shapes what we build next.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="bg-white text-navy hover:bg-white/90">Start free <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">Talk to us</Button>
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
