import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BuildFlow AI" },
      { name: "description", content: "How BuildFlow AI collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — BuildFlow AI" },
      { property: "og:description", content: "How BuildFlow AI collects, uses, and protects your data." },
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
        <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Privacy Policy</h1>
        <p className="mt-6">This page is maintained by the BuildFlow AI team to explain how we handle data on this platform. It is product-level information, not a legal certification.</p>

        <Section title="Information we collect">
          <p>When you create an account, we store your email address, an optional display name, and the onboarding answers you provide. When you generate a solution, we store the prompt you submitted and the AI's response so you can revisit it. When you save a project, we store the project name, description, and prompt.</p>
        </Section>
        <Section title="How we use information">
          <p>We use your data to operate the product: authenticate you, personalize AI generations, show your history, enforce plan limits, and contact you about your account. We do not sell your data.</p>
        </Section>
        <Section title="AI processing">
          <p>Prompts and onboarding context are forwarded to our AI provider to generate responses. We do not knowingly include personal information in prompts. Avoid pasting confidential or regulated data.</p>
        </Section>
        <Section title="Subprocessors">
          <ul className="list-disc space-y-1 pl-5">
            <li>Lovable Cloud — database, authentication, storage</li>
            <li>Lovable AI Gateway — model inference (Gemini)</li>
          </ul>
        </Section>
        <Section title="Cookies">
          <p>We use a small number of strictly-necessary cookies and localStorage entries to keep you signed in and remember UI preferences. No third-party analytics cookies are set on the marketing site.</p>
        </Section>
        <Section title="Retention and deletion">
          <p>Your data is retained while your account is active. You can delete your account from Settings; account data is removed within 30 days.</p>
        </Section>
        <Section title="Your rights">
          <p>You can request access, export, or deletion of your data by emailing <a className="underline" href="mailto:privacy@buildflow.ai">privacy@buildflow.ai</a>.</p>
        </Section>
        <Section title="Contact">
          <p>Questions? Reach us at <a className="underline" href="mailto:privacy@buildflow.ai">privacy@buildflow.ai</a>.</p>
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
