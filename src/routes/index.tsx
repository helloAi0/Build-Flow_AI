import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import {
  Sparkles, Wand2, Layers, Zap, Shield, Globe, ArrowRight,
  CheckCircle2, Boxes, MessageSquare, BarChart3, Calendar,
} from "lucide-react";
import { PLAN_LIST } from "@/lib/plans";

const STRUCTURED_DATA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BuildFlow AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "BuildFlow AI turns business problems into ready-to-use software: websites, CRMs, inventory, booking, and automations.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Starter", price: "9", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "29", priceCurrency: "USD" },
  ],
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildFlow AI — Describe your business problem. AI builds the solution." },
      { name: "description", content: "Generate websites, CRMs, inventory, booking, and automations for your small business in seconds with BuildFlow AI." },
      { property: "og:title", content: "BuildFlow AI" },
      { property: "og:description", content: "Describe your business problem. AI builds the solution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BuildFlow AI" },
      { name: "twitter:description", content: "Describe your business problem. AI builds the solution." },
    ],
    scripts: [{ type: "application/ld+json", children: STRUCTURED_DATA }],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Wand2, title: "AI Solution Generator", desc: "Describe your problem. Get a full software recommendation in seconds." },
  { icon: Layers, title: "Project Workspaces", desc: "Organize ideas and outputs into clean, shareable projects." },
  { icon: Boxes, title: "Pre-built Blueprints", desc: "Websites, CRM, inventory, booking, support — ready to ship." },
  { icon: Zap, title: "Instant Automation", desc: "Connect tools and automate the boring parts of your workflow." },
  { icon: Shield, title: "Secure by default", desc: "Your data is protected with industry-standard authentication and RLS." },
  { icon: Globe, title: "Built for SMBs", desc: "Designed for shops, freelancers, agencies, and solopreneurs." },
];

const STEPS = [
  { n: "01", title: "Describe", desc: "Tell BuildFlow AI what your business needs in plain English." },
  { n: "02", title: "Generate", desc: "AI builds a tailored set of solutions — website, CRM, automation, more." },
  { n: "03", title: "Launch", desc: "Pick what you love, save it as a project, and roll it out." },
];

const PLANS = PLAN_LIST.map((p) => ({
  name: p.name,
  price: p.priceLabel,
  desc: p.description,
  features: p.features,
  cta: p.id === "free" ? "Start free" : `Start ${p.name}`,
  featured: p.featured,
}));

const TESTIMONIALS = [
  { quote: "We replaced three SaaS tools with what BuildFlow generated in an afternoon.", name: "Maya Chen", role: "Owner, Studio Brae" },
  { quote: "I described my clothing shop and got a working CRM + inventory plan. Wild.", name: "Daniel Park", role: "Founder, Heron & Co" },
  { quote: "It feels like having a product team on tap for $9 a month.", name: "Aisha Rahman", role: "Freelance Designer" },
];

const FAQ = [
  { q: "What is BuildFlow AI?", a: "A platform where you describe a business problem and AI generates a tailored software solution — from websites to CRMs to automations." },
  { q: "Who is it for?", a: "Small businesses, shop owners, freelancers, agencies, solopreneurs, and early-stage startups." },
  { q: "Do I need to code?", a: "No. BuildFlow AI is built so non-technical founders can describe a need and get a working blueprint." },
  { q: "Can I cancel anytime?", a: "Yes. Paid plans are month-to-month and you can cancel from your settings." },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-hero text-white">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-20 sm:pb-28 md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.82_0.16_220)]" />
            Now in public beta — free to try
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
            Describe your business problem.
            <br />
            <span className="text-gradient-light">AI builds the solution.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            BuildFlow AI turns a sentence into a working blueprint — websites, CRMs, inventory,
            booking, support dashboards — tailored to your business.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="w-full bg-white text-navy hover:bg-white/90 sm:w-auto">
                Start building free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="ghost" className="w-full text-white/90 hover:bg-white/10 sm:w-auto">
                See pricing
              </Button>
            </Link>
          </div>

          {/* Mock prompt card */}
          <div className="relative mx-auto mt-16 max-w-3xl">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-brand-gradient blur-3xl opacity-40" />
            <Card className="border-white/10 bg-white/5 p-6 text-left backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-xs text-white/60">
                <Wand2 className="h-4 w-4" /> BuildFlow Prompt
              </div>
              <p className="font-display text-xl text-white">
                "I own a clothing shop and need customer management."
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Globe, t: "Branded website" },
                  { icon: MessageSquare, t: "Lightweight CRM" },
                  { icon: Boxes, t: "Inventory tracker" },
                  { icon: Zap, t: "Reorder automation" },
                ].map((s) => (
                  <div key={s.t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/90">
                    <s.icon className="h-4 w-4 text-[oklch(0.82_0.16_220)]" /> {s.t}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[oklch(0.18_0.05_260)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Features</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">Everything a small business needs, in one prompt.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-white/10 bg-white/[0.04] p-6 text-white">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-white/70">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[oklch(0.2_0.05_260)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">How it works</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">From idea to launch in three steps.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <Card key={s.n} className="border-white/10 bg-white/[0.04] p-8 text-white">
                <div className="text-gradient-light font-display text-5xl font-semibold">{s.n}</div>
                <h3 className="mt-4 font-display text-xl">{s.title}</h3>
                <p className="mt-2 text-sm text-white/70">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[oklch(0.18_0.05_260)] py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Why teams choose BuildFlow</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">Ship business software without a tech team.</h2>
            <ul className="mt-8 space-y-4 text-white/80">
              {["Replace 4–6 tools with a single platform", "Onboard customers, manage stock, automate ops", "Move from idea to launch in an afternoon", "Designed for non-technical founders"].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[oklch(0.82_0.16_220)]" /> <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, label: "Revenue +28%" },
              { icon: Calendar, label: "Bookings 3.4×" },
              { icon: MessageSquare, label: "Reply time -62%" },
              { icon: Boxes, label: "Stockouts -41%" },
            ].map((m) => (
              <Card key={m.label} className="border-white/10 bg-white/[0.04] p-6 text-white">
                <m.icon className="h-6 w-6 text-[oklch(0.82_0.16_220)]" />
                <p className="mt-4 font-display text-2xl">{m.label}</p>
                <p className="text-xs text-white/60">Avg. across pilot customers</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-[oklch(0.2_0.05_260)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Pricing</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">Simple plans that scale with you.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <Card key={p.name} className={`relative p-8 ${p.featured ? "border-transparent bg-brand-gradient text-white shadow-glow" : "border-white/10 bg-white/[0.04] text-white"}`}>
                {p.featured && <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2 py-0.5 text-xs">Popular</span>}
                <h3 className="font-display text-xl">{p.name}</h3>
                <p className="mt-1 text-sm opacity-80">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl">{p.price}</span>
                  <span className="text-sm opacity-70">/mo</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {f}</li>
                  ))}
                </ul>
                <Link to="/auth" search={{ mode: "signup" }} className="mt-8 block">
                  <Button className={p.featured ? "w-full bg-white text-navy hover:bg-white/90" : "w-full bg-white/10 text-white hover:bg-white/20"}>{p.cta}</Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[oklch(0.18_0.05_260)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Loved by builders</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">A platform founders actually keep using.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-white/10 bg-white/[0.04] p-6 text-white">
                <p className="text-white/90">"{t.quote}"</p>
                <div className="mt-6">
                  <p className="font-display text-sm">{t.name}</p>
                  <p className="text-xs text-white/60">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[oklch(0.2_0.05_260)] py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">FAQ</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">Questions, answered.</h2>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-white/[0.04] px-6">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-white/10">
                <AccordionTrigger className="text-left text-white hover:text-white">{f.q}</AccordionTrigger>
                <AccordionContent className="text-white/70">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Early access waitlist */}
      <section id="early-access" className="bg-[oklch(0.18_0.05_260)] py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Early access</p>
            <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">Get new templates and features first.</h2>
            <p className="mt-3 text-white/70">Join the early-access list. We send one short update when something meaningful ships — no spam, no fluff.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <WaitlistForm source="early_access" cta="Request early access" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-4xl text-white md:text-5xl">Your next business tool is one prompt away.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">Try BuildFlow AI free. No credit card. Cancel anytime.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="bg-white text-navy hover:bg-white/90">Start building free <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>


      <SiteFooter />
    </div>
  );
}
