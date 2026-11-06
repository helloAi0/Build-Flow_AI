import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — BuildFlow AI" },
      { name: "description", content: "The terms that govern your use of BuildFlow AI." },
      { property: "og:title", content: "Terms of Service — BuildFlow AI" },
      { property: "og:description", content: "The terms that govern your use of BuildFlow AI." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-dvh bg-hero text-white">
      <SiteNav />
      <article className="mx-auto max-w-3xl px-6 py-20 text-white/80">
        <p className="text-sm text-white/60">Last updated: June 22, 2026</p>
        <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Terms of Service</h1>
        <p className="mt-6">By creating an account or using BuildFlow AI you agree to these terms. Plain language summary below; consult counsel for specific legal advice.</p>

        <Section title="Your account">
          <p>You're responsible for the activity on your account, for keeping your credentials secure, and for the content of the prompts you submit. You must be at least 13 years old.</p>
        </Section>
        <Section title="Acceptable use">
          <p>Don't use BuildFlow AI to generate or distribute content that is illegal, infringes others' rights, harasses people, or violates the policies of our infrastructure providers.</p>
        </Section>
        <Section title="Plans, billing, and refunds">
          <p>Paid plans renew monthly until cancelled. You can change or cancel your plan at any time from Settings. Charges for the current billing period are non-refundable except where required by law.</p>
        </Section>
        <Section title="AI output">
          <p>AI-generated content is provided "as is". Review and validate it before using it commercially. We do not claim ownership of your prompts or outputs.</p>
        </Section>
        <Section title="Service availability">
          <p>BuildFlow AI is in public beta. Features may change, and we may impose reasonable rate limits to protect the service.</p>
        </Section>
        <Section title="Liability">
          <p>To the maximum extent permitted by law, BuildFlow AI is provided without warranties, and our liability is limited to the amount you paid us in the prior 12 months.</p>
        </Section>
        <Section title="Termination">
          <p>You can cancel at any time. We may suspend accounts that violate these terms.</p>
        </Section>
        <Section title="Contact">
          <p>Questions about these terms? Email <a className="underline" href="mailto:legal@buildflow.ai">legal@buildflow.ai</a>.</p>
        </Section>
      </article>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-3 text-white/75">{children}</div>
    </section>
  );
}
