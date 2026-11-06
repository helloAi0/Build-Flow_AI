import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TEMPLATES } from "@/lib/templates";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — BuildFlow AI" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const navigate = useNavigate();

  const use = (prompt: string) => {
    if (typeof window !== "undefined") sessionStorage.setItem("buildflow.prefill", prompt);
    navigate({ to: "/generate" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Business templates</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Pick a starting point. We'll prefill the AI generator with a tailored prompt.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.id} className="flex flex-col p-6 transition hover:shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient shadow-glow">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 font-display text-lg">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                ))}
              </div>
              <Button onClick={() => use(t.prompt)} className="mt-5 w-full bg-brand-gradient text-white hover:opacity-95">
                Use template <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
